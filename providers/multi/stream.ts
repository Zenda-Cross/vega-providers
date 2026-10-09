
import { Stream, ProviderContext } from "../types";
import { iqstExtractor } from "../extractors/iqst";
import { vidboltExtractor } from "../extractors/vidbolt";
import { cineverseExtractor } from "../extractors/cineverse";


const REFERER = "https://multimovies.garden/";

const BASE_HEADERS: Record<string, string> = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: REFERER,
};

const CINEVERSE_RE = /rozgarlelo\.modiplay\.xyz\/embed\//i;
const IQST_RE      = /streams\.iqsmartgames\.com\/embed\//i;
const VIDBOLT_RE   = /vidbolt\.xyz\//i;
const VIDOUT_RE    = /vidout\.pages\.dev\//i;
const FILMU_RE     = /embed\.filmu\.in\//i;

/* Per-server timeouts (ms). Fast ones get short budgets. */
const TIMEOUTS: Record<string, number> = {
  Cineverse: 15000,   // reduced from 30s, this one was the killer
  "GD mirror": 12000,
  VIDOUT: 5000,
  Filmu: 10000,
  VidBolt: 12000,
  default: 12000,
};


type MediaType = "movie" | "tv";

type StreamEx = Stream & {
  headers?: Record<string, string>;
  quality?: string;
  subtitles?: any[];
};

interface ServerEntry {
  id: string;
  name: string;
  url: string;
  index: number;
}

/* ================================================================== */
/*  Real abort-on-timeout helper                                       */
/*  Wraps a promise + an outer signal. On timeout, aborts the inner    */
/*  controller so axios actually cancels the network request.          */
/* ================================================================== */
function raceWithAbort<T>(
  run: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const ctrl = new AbortController();
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ctrl.abort(); } catch {}
      reject(new Error(label + " timeout " + ms + "ms"));
    }, ms);

    run(ctrl.signal).then(
      (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/* ================================================================== */
/*  Server chip parsing (unchanged)                                    */
/* ================================================================== */
function parseServersCheerio(html: string, cheerio: any): ServerEntry[] {
  const out: ServerEntry[] = [];
  let $: any;
  try {
    $ = cheerio.load(html, { decodeEntities: false }, false);
  } catch (e: any) {
    console.warn("[stream] cheerio.load failed: " + (e && e.message));
    return out;
  }

  const selectors = [
    "button.server-chip[data-url]",
    "#playerServerGrid button[data-url]",
    ".server-grid button[data-url]",
    "[data-url][data-server-index]",
    "button[data-url]",
  ];

  let nodes: any = null;
  for (let i = 0; i < selectors.length; i++) {
    try {
      const found = $(selectors[i]);
      if (found && found.length > 0) { nodes = found; break; }
    } catch {}
  }
  if (!nodes) return out;

  nodes.each(function (this: any, _i: number, el: any) {
    try {
      const $el = $(el);
      const url = String($el.attr("data-url") || "").trim();
      if (!url) return;
      const id = String($el.attr("data-id") || "");
      const index = parseInt(String($el.attr("data-server-index") || "0"), 10) || 0;
      let name = "";
      try { name = String($el.find(".server-name").text() || "").trim(); } catch {}
      if (!name) name = id || "Server";
      out.push({ id, name, url, index });
    } catch {}
  });
  return out;
}

function parseServersRegex(html: string): ServerEntry[] {
  const out: ServerEntry[] = [];
  const re = /<button\b[^>]*\bdata-url\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/button>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const full = m[0];
    const url = String(m[1] || "").trim();
    const inner = m[2] || "";
    if (!url) continue;
    const idM = full.match(/\bdata-id\s*=\s*"([^"]*)"/i);
    const idxM = full.match(/\bdata-server-index\s*=\s*"([^"]*)"/i);
    const nameM = inner.match(/class\s*=\s*"server-name"[^>]*>([^<]*)</i);
    const id = idM ? idM[1] : "";
    let name = nameM ? String(nameM[1]).trim() : "";
    if (!name) name = id || "Server";
    out.push({
      id,
      name,
      url,
      index: idxM ? parseInt(idxM[1], 10) || 0 : 0,
    });
  }
  return out;
}

function parseServers(html: string, cheerio: any): ServerEntry[] {
  let list = parseServersCheerio(html, cheerio);
  if (list.length === 0) list = parseServersRegex(html);

  const seen: Record<string, boolean> = {};
  const deduped: ServerEntry[] = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (seen[s.url]) continue;
    seen[s.url] = true;
    deduped.push(s);
  }
  deduped.sort((a, b) => a.index - b.index);
  return deduped;
}

/* ================================================================== */
/*  Inline resolvers (VIDOUT, Filmu)                                   */
/* ================================================================== */

/* VIDOUT: try both IMDB (tt…) and TMDB numeric. Try /movie/ and /hls/movie/. */
async function resolveVidout(
  url: string,
  _mediaType: MediaType,
  signal: AbortSignal,
  ctx: ProviderContext,
): Promise<Stream[]> {
  const out: Stream[] = [];
  const RAW = "https://raw.githubusercontent.com/Watchout2025/api/refs/heads/main";

  // mediaId as it appears in the URL: tt3495030 / 1269325
  const idMatch = url.match(/\/movie\/([^/?#]+)/);
  if (!idMatch) return out;
  const primaryId = idMatch[1];

  // Candidate id set: primary, and any ?tmdb= query override
  const candidates: string[] = [primaryId];
  try {
    const u = new URL(url);
    const t = u.searchParams.get("tmdb");
    if (t && candidates.indexOf(t) < 0) candidates.push(t);
  } catch {}

  const paths = [
    "/hls/movie/",
    "/movie/",
    "/hls/",
    "/",
  ];

  outer:
  for (let i = 0; i < candidates.length; i++) {
    const id = candidates[i];
    for (let j = 0; j < paths.length; j++) {
      const href = RAW + paths[j] + id;
      try {
        const r = await ctx.axios.get(href, {
          headers: Object.assign({}, BASE_HEADERS, {
            Referer: "https://vidout.pages.dev/",
          }),
          signal,
        });
        const body = String(r.data || "").trim();
        // Expect raw text: either a URL, or a JSON object with a url field
        let hlsUrl = "";
        if (body.indexOf("http") === 0) {
          hlsUrl = body.split(/\s+/)[0];
        } else if (body.charAt(0) === "{") {
          try {
            const obj = JSON.parse(body);
            hlsUrl = String(obj.url || obj.hls || obj.link || "");
          } catch {}
        }
        if (hlsUrl && hlsUrl.indexOf("http") === 0) {
          out.push({ server: "VIDOUT", link: hlsUrl, type: "m3u8" });
          break outer;
        }
      } catch {
        // try next path/id
      }
    }
  }
  return out;
}

async function resolveFilmu(
  url: string,
  mediaType: MediaType,
  signal: AbortSignal,
  ctx: ProviderContext,
): Promise<Stream[]> {
  const out: Stream[] = [];
  const HOST = "https://embed.filmu.in";

  const idMatch = url.match(/\/(?:movie|tv)\/(\d+)/);
  if (!idMatch) return out;
  const tmdbId = idMatch[1];

  const apiPath =
    mediaType === "tv"
      ? HOST + "/api/singularity-tv?tmdb=" + tmdbId
      : HOST + "/api/singularity-movie?id=" + tmdbId;

  try {
    const r = await ctx.axios.get(apiPath, {
      headers: Object.assign({}, BASE_HEADERS, {
        Referer: HOST + "/" + mediaType + "/" + tmdbId,
      }),
      signal,
    });
    const root = r.data || {};
    const base = root._base || "";
    const sources = Array.isArray(root.sources) ? root.sources : [];

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i] || {};
      let u = String(src.url || "");
      if (!u) continue;
      if (u.indexOf("http") !== 0 && base) {
        try { u = new URL(u, base).toString(); } catch {}
      }
      if (u.indexOf("http") !== 0) continue;
      out.push({
        server: "Filmu " + (src.quality || "1080p"),
        link: u,
        type: "m3u8",
      });
    }

    if (out.length === 0) {
      let single = String(root.url || "");
      if (!single && root.multilingual) single = String(root.multilingual_url || "");
      if (single.indexOf("http") === 0) {
        out.push({
          server: "Filmu " + (root.quality || "1080p"),
          link: single,
          type: "m3u8",
        });
      } else if (root.m3u8_path && base) {
        try {
          out.push({
            server: "Filmu " + (root.quality || "1080p"),
            link: new URL(root.m3u8_path, base).toString(),
            type: "m3u8",
          });
        } catch {}
      }
    }
  } catch (e: any) {
    console.warn("[stream] filmu: " + (e && e.message));
  }
  return out;
}

/* ================================================================== */
/*  Route dispatcher — passes inner signal so timeout actually cancels */
/* ================================================================== */
async function routeServer(
  url: string,
  mediaType: MediaType,
  signal: AbortSignal,
  ctx: ProviderContext,
): Promise<Stream[]> {
  const h = BASE_HEADERS;

  if (CINEVERSE_RE.test(url)) {
    return cineverseExtractor(url, signal, ctx.axios, ctx.cheerio, h, ctx);
  }
  if (IQST_RE.test(url)) {
    return iqstExtractor(url, signal, ctx.axios, ctx.cheerio, h, ctx);
  }
  if (VIDBOLT_RE.test(url)) {
    return vidboltExtractor(url, signal, ctx.axios, ctx.cheerio, h, ctx);
  }
  if (VIDOUT_RE.test(url)) {
    return resolveVidout(url, mediaType, signal, ctx);
  }
  if (FILMU_RE.test(url)) {
    return resolveFilmu(url, mediaType, signal, ctx);
  }
  return [];
}

/* ================================================================== */
/*  Media type detection                                               */
/* ================================================================== */
function detectMediaType(type: string, link: string, html: string): MediaType {
  const t = (type || "").toLowerCase();
  if (t.indexOf("tv") >= 0 || t.indexOf("series") >= 0 || t.indexOf("show") >= 0)
    return "tv";
  if (t.indexOf("movie") >= 0 || t.indexOf("film") >= 0) return "movie";
  if (/\/tv\//i.test(link) || /\/series\//i.test(link)) return "tv";
  if (/\/movie\//i.test(link) || /\/film\//i.test(link)) return "movie";
  if (/\/tv\//i.test(html)) return "tv";
  return "movie";
}

/* ================================================================== */
/*  MAIN — parallel resolution                                         */
/* ================================================================== */
export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const axios = providerContext.axios;
  const cheerio = providerContext.cheerio;
  const t0 = Date.now();

  // 1) Load page
  let html = "";
  try {
    const res = await axios.get(link, { headers: BASE_HEADERS, signal });
    html = res.data;
  } catch (e: any) {
    console.error("[stream] page load failed: " + (e && e.message));
    return [];
  }

  // 2) Parse chips
  const servers = parseServers(html, cheerio);
  console.log("[stream] " + servers.length + " chip(s) parsed");

  if (servers.length === 0) return [];

  const mediaType = detectMediaType(type, link, html);
  console.log("[stream] media type=" + mediaType + "  starting parallel run");

  // 3) Fire ALL servers in parallel with per-server timeouts
  const jobs = servers.map((server) => {
    const budget = TIMEOUTS[server.name] || TIMEOUTS.default;
    const t = Date.now();

    return raceWithAbort(
      (innerSignal) => routeServer(server.url, mediaType, innerSignal, providerContext),
      budget,
      server.name,
    ).then(
      (streams) => {
        const dt = Date.now() - t;
        console.log("[stream] <- " + server.name + ": " + streams.length + " in " + dt + "ms");
        return { server, streams };
      },
      (e: any) => {
        const dt = Date.now() - t;
        console.warn("[stream] x " + server.name + " (" + dt + "ms): " + (e && e.message));
        return { server, streams: [] as Stream[] };
      },
    );
  });

  const settled = await Promise.all(jobs);

  // 4) Merge
  const streamLinks: StreamEx[] = [];
  const fallbacks: Stream[] = [];
  for (let i = 0; i < settled.length; i++) {
    const { server, streams } = settled[i];
    if (streams.length === 0) {
      fallbacks.push({
        server: server.name + " (embed)",
        link: server.url,
        type: "iframe",
      });
      continue;
    }
    for (let j = 0; j < streams.length; j++) {
      const ex = streams[j] as StreamEx;
      const merged: StreamEx = {
        server: server.name + " / " + (ex.server || "stream"),
        link: ex.link,
        type: ex.type || "m3u8",
      };
      if (ex.headers) merged.headers = ex.headers;
      if (ex.quality) merged.quality = ex.quality;
      if (ex.subtitles) merged.subtitles = ex.subtitles;
      streamLinks.push(merged);
    }
  }

  console.log(
    "[stream] DONE " + streamLinks.length + " real + " +
    fallbacks.length + " iframe in " + (Date.now() - t0) + "ms",
  );

  if (streamLinks.length === 0 && fallbacks.length > 0) return fallbacks;
  return streamLinks as Stream[];
}