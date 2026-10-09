// extractors/cineverse.ts
import { Stream } from "../types";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const HUB = "https://rozgarlelo.modiplay.xyz";
const REFERER_HUB = "https://multimovies.garden/";

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36";

/* ================================================================== */
/*  Headers                                                            */
/* ================================================================== */
function buildHeaders(): Record<string, string> {
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    "User-Agent": MOBILE_UA,
    Referer: HUB + "/",
  };
}

function buildPlaybackHeaders(): Record<string, string> {
  return {
    "User-Agent": MOBILE_UA,
    Accept: "*/*",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    Origin: HUB,
    Referer: HUB + "/",
  };
}

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
type StreamOut = Stream & {
  headers?: Record<string, string>;
};

interface ServerItem {
  platform: string;
  name: string;
  code: string;
}

/* ================================================================== */
/*  De-escape: \/ -> /, \\/ -> /, \uXXXX -> char, &amp; -> &           */
/* ================================================================== */
function deEscape(s: string): string {
  return String(s)
    .replace(/\\+u([0-9a-fA-F]{4})/g, function (_m, h) {
      return String.fromCharCode(parseInt(h, 16));
    })
    .replace(/\\+\//g, "/")
    .replace(/&amp;/g, "&");
}

/* ================================================================== */
/*  Extract m3u8 from proxy page HTML                                  */
/*    var directSrc="https://CDN/master.m3u8?..."  -> use as-is        */
/*    var src="/stream_proxy.php?url=..."          -> HUB + path       */
/*    any absolute https://...master.m3u8          -> use as-is        */
/*    /hls/.../master.m3u8                         -> HUB + path       */
/* ================================================================== */
function extractM3u8(html: string): string | null {
  const decoded = deEscape(html);

  // 1) var directSrc="https://...master.m3u8?token=..."
  let m = decoded.match(/var\s+directSrc\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i);
  if (m && m[1] && /^https?:\/\//i.test(m[1])) {
    return m[1].trim();
  }

  // 2) var src="/stream_proxy.php?url=...&ref=...&tok=..."
  //    Return the relay — the hub handles CDN referer + token validation.
  m = decoded.match(
    /["']((?:\/|https?:\/\/)[^"'\s<>]*stream_proxy\.php\?url=[^"'\s<>]+)["']/i,
  );
  if (m && m[1]) {
    let url = m[1].trim();
    if (url.indexOf("http") !== 0) {
      url = HUB + (url.indexOf("/") === 0 ? url : "/" + url);
    }
    if (!/[?&]seg=/.test(url)) {
      url += "&seg=direct";
    }
    return url;
  }

  // 3) Any absolute .m3u8 URL
  m = decoded.match(/https?:\/\/[^"'\s\\<>]+\.m3u8[^"'\s\\<>]*/i);
  if (m) return m[0];

  // 4) Bare relative /hls/.../master.m3u8
  m = decoded.match(/["'](\/hls\/[^"'\s]+master\.m3u8[^"'\s]*)["']/i);
  if (m && m[1]) return HUB + m[1];

  return null;
}

/* ================================================================== */
/*  Parse switchServer(...) items                                      */
/* ================================================================== */
function parseServers(html: string): ServerItem[] {
  const out: ServerItem[] = [];
  const seen: Record<string, boolean> = {};

  const re = /switchServer\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const platform = m[2];
    if (!platform || seen[platform]) continue;
    seen[platform] = true;
    out.push({ platform: platform, name: m[3], code: m[4] });
  }
  return out;
}

/* ================================================================== */
/*  Fetch one proxy page and return the m3u8                           */
/* ================================================================== */
async function resolveProxyPage(
  server: ServerItem,
  axios: any,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ url: string } | null> {
  const proxyUrl =
    HUB + "/proxy.php?p=" + encodeURIComponent(server.platform) +
    "&c=" + encodeURIComponent(server.code) +
    "&title=" + encodeURIComponent("") +
    "&site_ref=" + encodeURIComponent(REFERER_HUB) +
    "&noredirect=1";

  console.log("[cineverse] proxy " + server.platform + " (" + server.code + ")");

  let resp: any;
  try {
    resp = await axios.get(proxyUrl, {
      headers: headers,
      signal: signal,
      timeout: 6000,
      maxRedirects: 0,
      validateStatus: function () { return true; },
    });
  } catch (e: any) {
    console.warn("[cineverse] " + server.platform + " failed: " + (e && e.message));
    return null;
  }

  const html: string = typeof resp.data === "string" ? resp.data : String(resp.data || "");
  console.log("[cineverse] " + server.platform + " -> " + resp.status + " (" + html.length + ")");

  if (resp.status >= 300 && resp.status < 400) {
    const loc = (resp.headers && (resp.headers.location || resp.headers["Location"])) || "";
    if (loc && /\.m3u8/i.test(loc)) return { url: loc };
    return null;
  }

  const m3u8 = extractM3u8(html);
  if (!m3u8) {
    console.log("[cineverse] " + server.platform + " -> no m3u8");
    return null;
  }

  console.log("[cineverse] " + server.platform + " -> " + m3u8);
  return { url: m3u8 };
}

/* ================================================================== */
/*  CINEVERSE EXTRACTOR                                                */
/* ================================================================== */
export async function cineverseExtractor(
  link: string,
  signal: AbortSignal,
  axios: any,
  _cheerio: any,
  _headers: Record<string, string>,
  _providerContext?: any,
): Promise<Stream[]> {
  const streamLinks: StreamOut[] = [];
  const t0 = Date.now();
  const headers = buildHeaders();

  console.log("[cineverse] -> " + link);

  // 1) Fetch embed page
  let html = "";
  try {
    const r = await axios.get(link, {
      headers: Object.assign({}, headers, { Referer: REFERER_HUB }),
      signal: signal,
      timeout: 6000,
      validateStatus: function () { return true; },
    });
    html = typeof r.data === "string" ? r.data : String(r.data || "");
    console.log("[cineverse] embed -> " + r.status + " (" + html.length + ")");
  } catch (e: any) {
    console.error("[cineverse] embed: " + (e && e.message));
    return streamLinks;
  }

  // 2) Parse switchServer(...)
  const servers = parseServers(html);
  console.log("[cineverse] servers=" + servers.length);

  if (servers.length === 0) {
    console.log("[cineverse] embed head: " + html.slice(0, 200).replace(/\s+/g, " "));
    return [];
  }

  // 3) Fetch all proxy pages in parallel
  const results = await Promise.allSettled(
    servers.map(function (s) {
      return resolveProxyPage(s, axios, headers, signal);
    }),
  );

  // 4) Merge + dedupe by link (prevents React duplicate-key warnings)
  const playbackHeaders = buildPlaybackHeaders();
  const seenLinks = new Set<string>();
  let dropped = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status !== "fulfilled" || !r.value) continue;

    const url = r.value.url;
    if (!url) continue;

    if (seenLinks.has(url)) {
      dropped++;
      continue;
    }
    seenLinks.add(url);

    streamLinks.push({
      server: "Cineverse " + servers[i].name,
      link: url,
      type: "m3u8",
      headers: playbackHeaders,
    });
  }

  if (dropped > 0) {
    console.log("[cineverse] dropped " + dropped + " duplicate link(s)");
  }

  console.log(
    "[cineverse] " + streamLinks.length + " streams in " + (Date.now() - t0) + "ms",
  );
  return streamLinks as Stream[];
}

/* ================================================================== */
/*  Aliases                                                            */
/* ================================================================== */
export const getCineverseStream = cineverseExtractor;