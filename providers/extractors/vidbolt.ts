// extractors/vidbolt.ts
import { Stream } from "../types";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const MOVY_KEY = "0f461eaa465bb2a7acd037425217f2f209ef540a3171e1ac";
const CURX_KEY = "streamrip_secret_2026";
const SCRAPER  = "https://scraper.vidbolt.xyz";
const REFERER  = "https://vidbolt.xyz/";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/* ================================================================== */
/*  Headers                                                            */
/* ================================================================== */
function buildHeaders(): Record<string, string> {
  return {
    Accept: "application/json, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": UA,
    Referer: REFERER,
    Origin: "https://vidbolt.xyz",
  };
}

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
interface Parsed {
  isTv: boolean;
  tmdbId: string;
  season?: number;
  episode?: number;
  title?: string;
  year?: string;
  imdbId?: string;
}

/* ================================================================== */
/*  URL parser                                                         */
/* ================================================================== */
function parseVidboltUrl(link: string): Parsed {
  const u = new URL(link);
  const m = u.pathname.match(/^\/(movie|tv)\/(\d+)/);
  if (!m) throw new Error("Unsupported VidBolt URL: " + link);

  const out: Parsed = { isTv: m[1] === "tv", tmdbId: m[2] };

  if (out.isTv) {
    const se = u.pathname.match(/^\/tv\/\d+\/(\d+)\/(\d+)/);
    if (se) {
      out.season = Number(se[1]);
      out.episode = Number(se[2]);
    }
  }

  const q = u.searchParams;
  const qTitle = q.get("title");
  const qYear  = q.get("year");
  const qImdb  = q.get("imdb");
  if (qTitle) out.title  = qTitle;
  if (qYear)  out.year   = qYear;
  if (qImdb)  out.imdbId = qImdb;

  return out;
}

/* ================================================================== */
/*  Response shape flattener                                           */
/*  Handles: {sources:[…]}  {data:{sources:[…]}}  {result:{sources:[…]}}*/
/*           {data:[…]}  {result:[…]}  [...]                           */
/* ================================================================== */
function extractSources(root: any): any[] {
  if (!root) return [];
  if (Array.isArray(root)) return root;
  if (Array.isArray(root.sources)) return root.sources;
  if (root.data) {
    if (Array.isArray(root.data)) return root.data;
    if (Array.isArray(root.data.sources)) return root.data.sources;
  }
  if (root.result) {
    if (Array.isArray(root.result)) return root.result;
    if (Array.isArray(root.result.sources)) return root.result.sources;
  }
  if (Array.isArray(root.files)) return root.files;
  if (Array.isArray(root.links)) return root.links;
  return [];
}

/* ================================================================== */
/*  Source adder                                                       */
/* ================================================================== */
function addSources(root: any, label: string, results: Stream[]): boolean {
  const sources = extractSources(root);
  let any = false;

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i] || {};
    let url = String(src.url || src.link || src.file || src.src || "");
    if (!url) continue;
    if (url.indexOf("//") === 0) url = "https:" + url;
    if (url.indexOf("http") !== 0) continue;

    const quality = String(src.quality || src.label || src.resolution || "HD");
    const language = String(src.language || src.lang || src.audio || "");
    const langTag =
      language && language.toLowerCase() !== "original"
        ? " " + language
        : "";

    results.push({
      server: (label + " " + quality + langTag).trim(),
      link: url,
      type: /\.m3u8/i.test(url) ? "m3u8" : "mp4",
    });
    any = true;
  }

  return any;
}

/* ================================================================== */
/*  Safe JSON getter — never throws                                */
/* ================================================================== */
async function tryGet(
  axios: any,
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  label: string,
): Promise<any | null> {
  try {
    const r = await axios.get(url, {
      headers: headers,
      signal: signal,
      timeout: 10000,
      validateStatus: function (s: number) { return s < 500; },
    });
    if (r.status >= 400) {
      console.warn("[vidbolt] " + label + " -> " + r.status);
      return null;
    }
    return r.data;
  } catch (e: any) {
    console.warn("[vidbolt] " + label + " failed: " + ((e && e.message) || e));
    return null;
  }
}

/* ================================================================== */
/*  VIDBOLT EXTRACTOR                                                  */
/* ================================================================== */
export async function vidboltExtractor(
  link: string,
  signal: AbortSignal,
  axios: any,
  _cheerio: any,
  _headers: Record<string, string>,
  _providerContext?: any,
): Promise<Stream[]> {
  const streamLinks: Stream[] = [];
  const t0 = Date.now();

  let parsed: Parsed;
  try {
    parsed = parseVidboltUrl(link);
  } catch (e: any) {
    console.error("[vidbolt] url: " + (e && e.message));
    return streamLinks;
  }

  const isTv = parsed.isTv;
  const tmdbId = parsed.tmdbId;
  const season = parsed.season;
  const episode = parsed.episode;
  const title = parsed.title || "";
  const year = parsed.year || "";
  const imdbId = parsed.imdbId || "";

  console.log("[vidbolt] -> " + link);
  console.log(
    "[vidbolt] type=" + (isTv ? "tv" : "movie") +
    " tmdb=" + tmdbId +
    (isTv ? " s=" + season + " e=" + episode : "") +
    (title ? " title=" + title : "") +
    (imdbId ? " imdb=" + imdbId : ""),
  );

  const headers = buildHeaders();

  /* ================================================================ */
  /*  MOVIES: Movy.lol + scraper fleet                                */
  /* ================================================================ */
  if (!isTv) {
    /* ---- Orion (Movy) ---- */
    const movyUrl =
      "https://api.movy.lol/api/source/" + encodeURIComponent(tmdbId) +
      "?api_key=" + MOVY_KEY + "&apikey=" + MOVY_KEY;
    try {
      const movy = await tryGet(axios, movyUrl, headers, signal, "Movy");
      if (movy) {
        const added = addSources(movy, "Orion", streamLinks);
        if (added) console.log("[vidbolt] Orion -> " + streamLinks.length);
      }
    } catch {}
  }

  /* ================================================================ */
  /*  TV: AnimeCurx                                                   */
  /* ================================================================ */
  if (isTv && season != null && episode != null) {
    const curxUrl =
      "https://img.animecurx.tech/api/tv/" +
      encodeURIComponent(tmdbId) + "/" +
      encodeURIComponent(String(season)) + "/" +
      encodeURIComponent(String(episode)) +
      "?api_key=" + CURX_KEY + "&apikey=" + CURX_KEY;
    try {
      const curx = await tryGet(axios, curxUrl, headers, signal, "AnimeCurx");
      if (curx) {
        const added = addSources(curx, "Orion", streamLinks);
        if (added) console.log("[vidbolt] AnimeCurx -> " + streamLinks.length);
      }
    } catch {}
  }

  /* ================================================================ */
  /*  SCRAPER FLEET: Quasar / Saffron / Callisto                      */
  /*  All 3 fire in parallel                                          */
  /* ================================================================ */
  const idForScraper = imdbId || ("tmdb" + tmdbId);
  const streamType = isTv ? "tv" : "movie";
  const epTag = isTv && season != null && episode != null
    ? " S" + season + "E" + episode
    : "";
  const titleFull = title ? (title + epTag) : "";

  /* ---- Quasar ---- */
  const quasarParams = new URLSearchParams();
  quasarParams.append("tmdbId", tmdbId);
  if (imdbId) quasarParams.append("imdbId", imdbId);
  if (titleFull) quasarParams.append("title", titleFull);
  if (year) quasarParams.append("year", year);
  if (isTv && season != null) quasarParams.append("season", String(season));
  if (isTv && episode != null) quasarParams.append("episode", String(episode));

  /* ---- Saffron ---- */
  const saffronParams = new URLSearchParams();
  saffronParams.append("tmdbId", tmdbId);
  if (imdbId) saffronParams.append("imdbId", imdbId);
  if (titleFull) saffronParams.append("title", titleFull);
  if (year) saffronParams.append("year", year);
  if (isTv && season != null) saffronParams.append("season", String(season));
  if (isTv && episode != null) saffronParams.append("episode", String(episode));

  /* ---- Callisto ---- */
  const callistoParams = new URLSearchParams();
  callistoParams.append("tmdbId", tmdbId);
  if (imdbId) callistoParams.append("imdbId", imdbId);
  if (titleFull) callistoParams.append("title", titleFull);
  if (year) callistoParams.append("year", year);
  if (isTv && season != null) callistoParams.append("season", String(season));
  if (isTv && episode != null) callistoParams.append("episode", String(episode));

  const jobs = [
    {
      label: "Quasar",
      url: SCRAPER + "/scrape/Quasar/" + streamType + "/" +
           encodeURIComponent(idForScraper) + "?" + quasarParams.toString(),
    },
    {
      label: "Saffron",
      url: SCRAPER + "/scrape/Saffron/" + streamType + "/" +
           encodeURIComponent(idForScraper) + "?" + saffronParams.toString(),
    },
    {
      label: "Callisto",
      url: SCRAPER + "/scrape/Callisto/" + streamType + "/" +
           encodeURIComponent(idForScraper) + "?" + callistoParams.toString(),
    },
  ];

  const results = await Promise.all(
    jobs.map(function (job) {
      return tryGet(axios, job.url, headers, signal, job.label)
        .then(function (data) {
          return { label: job.label, data: data };
        });
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.data) continue;
    const added = addSources(r.data, r.label, streamLinks);
    if (added) {
      console.log("[vidbolt] " + r.label + " -> " + streamLinks.length + " total");
    }
  }

  /* ================================================================ */
  /*  Dedupe by URL                                                   */
  /* ================================================================ */
  const seen = new Set<string>();
  const deduped: Stream[] = [];
  for (let i = 0; i < streamLinks.length; i++) {
    const s = streamLinks[i];
    if (!s.link || seen.has(s.link)) continue;
    seen.add(s.link);
    deduped.push(s);
  }

  console.log(
    "[vidbolt] " + deduped.length + " streams in " + (Date.now() - t0) + "ms",
  );
  return deduped;
}

/* ================================================================== */
/*  Aliases                                                            */
/* ================================================================== */
export const getVidboltStream = vidboltExtractor;