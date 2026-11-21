// stream.ts
import { ProviderContext, Stream } from "../types";

const BASE_URL = "https://cd2735efc006-orangestream.baby-beamup.club";

const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  Referer: `${BASE_URL}/`,
};

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
  const { axios } = providerContext;

  try {
    const sepIdx = link.indexOf("::");
    const decodedType = sepIdx >= 0 ? link.slice(0, sepIdx) : type || "movie";
    const id =
      sepIdx >= 0 ? link.slice(sepIdx + 2).replace(/^v\d+:/, "") : link;
    if (!id) return [];

    const url = `${BASE_URL}/stream/${encodeURIComponent(
      decodedType,
    )}/${encodeURIComponent(id)}.json`;

    console.log("[orangestream] stream:", url);
    const res = await axios.get(url, { headers, signal, timeout: 30_000 });
    const streams: any[] = res.data?.streams ?? [];

    return streams
      .map(rawToStream)
      .filter((s): s is Stream => !!s && !!s.link);
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    console.error("[orangestream] getStream error:", err?.message ?? err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Stremio stream → Stream mapper
//  Mirrors ProviderManager.mapStreamObject exactly so RN-Video behaves
//  identically to the direct-manifest path.
// ═══════════════════════════════════════════════════════════════════

function rawToStream(s: any): Stream | null {
  if (!s || typeof s !== "object") return null;

  // ---- URLs -------------------------------------------------------
  const rawUrl: string      = s.url || "";
  const externalUrl: string = s.externalUrl || s.external_url || "";
  const infoHash: string | undefined = s.infoHash || s.info_hash;
  const magnetFromHash = infoHash ? `magnet:?xt=urn:btih:${infoHash}` : "";

  const isTorrent =
    !!infoHash ||
    rawUrl.startsWith("magnet:") ||
    s.type === "torrent" ||
    s.type === "Torrent";

  const effectiveUrl = rawUrl || externalUrl || magnetFromHash;
  if (!effectiveUrl) return null;

  // ---- Type -------------------------------------------------------
  //  ★ The critical fix: only `externalUrl` (no `url`) is external.
  //    Any other http(s) URL — even without a file extension — is
  //    treated as a direct mp4 stream so RN-Video handles it.
  const isExternalOnly = !rawUrl && !!externalUrl;
  const detectedType = isExternalOnly
    ? "external"
    : detectStreamType(effectiveUrl, isTorrent);

  // ---- Headers / subtitles ---------------------------------------
  const reqHeaders = extractRequestHeaders(s);
  const subtitles  = normaliseSubtitles(s.subtitles);

  // ---- Build stream ----------------------------------------------
  const stream: any = {
    // Display / metadata
    server: s.name || s.title || "Toonix",
    quality: extractQuality(s),
    externalUrl: externalUrl || undefined,
    behaviorHints: s.behaviorHints,
    filename: s.behaviorHints?.filename,

    // ★ Preserve every original field (url, name, title, attrs, …)
    ...s,

    // Overrides — always last so they win over the spread
    link: effectiveUrl,
    type: detectedType,
    headers: reqHeaders,
    subtitles,
    isHls: detectedType === "hls",
    isDash: detectedType === "dash",
    isTorrent,
    external: detectedType === "external",
    notWebReady: s.behaviorHints?.notWebReady === true,
    infoHash,
  };

  if (!reqHeaders) delete stream.headers;
  if (!subtitles) delete stream.subtitles;

  return stream as Stream;
}

// ─── Helpers (identical to ProviderManager) ────────────────────────

function detectStreamType(rawUrl: string, isTorrent: boolean): string {
  if (isTorrent) return "torrent";
  if (/\.m3u8(\?|#|$)/i.test(rawUrl)) return "hls";
  if (/\.mpd(\?|#|$)/i.test(rawUrl))  return "dash";
  if (/\.(mp4|mkv|webm|mov|m4v)(\?|#|$)/i.test(rawUrl)) return "mp4";
  // ★ KEY FIX — an http(s) URL with no recognisable extension is still a
  //   direct stream (signed CDN links, redirectors). RN-Video can play
  //   it; VLC doesn't need to be opened.
  if (/^https?:\/\//i.test(rawUrl)) return "mp4";
  return "external";
}

function extractRequestHeaders(
  s: any,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const merge = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && v.length > 0 && !(k in out)) {
        out[k] = v;
      }
    }
  };
  // Check every location Stremio addons use for headers
  merge(s?.behaviorHints?.proxyHeaders?.request);
  merge(s?.behaviorHints?.proxyHeaders);
  merge(s?.behaviorHints?.headers);
  merge(s?.proxyHeaders?.request);
  merge(s?.proxyHeaders);
  merge(s?.headers);
  return Object.keys(out).length > 0 ? out : undefined;
}

function extractQuality(s: any): string {
  if (typeof s?.quality === "string" && s.quality) return s.quality;
  const source = `${s?.title || ""} ${s?.name || ""} ${s?.url || ""}`;
  const m = source.match(/\b(\d{3,4})p\b/);
  return m ? m[1] : "";
}

function normaliseSubtitles(raw: any): any[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: any[] = [];
  for (const sub of raw) {
    if (!sub || typeof sub !== "object") continue;
    const url = sub.url || sub.uri;
    if (typeof url !== "string" || url.length === 0) continue;
    out.push({
      headers: sub.headers ?? undefined,
      ...sub,
      id: sub.id ?? `${sub.lang ?? "und"}_${out.length}`,
      url,
      lang: sub.lang ?? sub.language ?? "und",
    });
  }
  return out.length > 0 ? out : undefined;
}