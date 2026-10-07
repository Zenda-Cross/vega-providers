import { ProviderContext, Stream, TextTracks } from "../types";

const MOVY_API_BASE = "https://api.wecollege.net";
const ORIGIN = "https://www.movy.sx";

interface MovyServerConfig {
  id: string;
  displayName: string;
  mayHave4K?: boolean;
  quality?: string;
  audio?: string;
}

const MOVY_SERVERS: MovyServerConfig[] = [
  { id: "miami", displayName: "Movy - Miami (Multi/4K)", mayHave4K: true },
  { id: "boise", displayName: "Movy - Boise (Multi/4K)", mayHave4K: true },
  { id: "atlanta", displayName: "Movy - Atlanta", quality: "1080" },
  { id: "phoenix", displayName: "Movy - Phoenix", quality: "1080" },
  { id: "austin", displayName: "Movy - Austin" },
  { id: "delhi", displayName: "Movy - Delhi (Hindi)", audio: "Hindi" },
  { id: "dallas", displayName: "Movy - Dallas" },
  { id: "tampa", displayName: "Movy - Tampa" },
  { id: "orlando", displayName: "Movy - Orlando" },
  { id: "vegas", displayName: "Movy - Vegas" },
  { id: "cancun", displayName: "Movy - Cancun" },
];

const D_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
];
const MAGIC_PREFIX = [109, 118, 109, 49];

function rotR(e: number, a: number): number {
  e >>>= 0;
  if ((a &= 31) === 0) return e >>> 0;
  return ((e << a) | (e >>> (32 - a))) >>> 0;
}

function scramble(e: number): number {
  e >>>= 0;
  e ^= e >>> 16;
  e = Math.imul(e, 0x85ebca6b) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 0xc2b2ae35) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}

function decodeBase64ToUint8(str: string): Uint8Array {
  const clean = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = clean.padEnd(4 * Math.ceil(clean.length / 4), "=");
  if (typeof atob !== "undefined") {
    const bin = atob(pad);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      u8[i] = bin.charCodeAt(i);
    }
    return u8;
  }
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(pad, "base64"));
  }
  return new Uint8Array(0);
}

function decodePayload(
  ciphertext: string,
  seed: string,
  mediaId: string | number
): string {
  const rawBytes = decodeBase64ToUint8(ciphertext);
  const tLen = rawBytes.length;
  if (tLen < MAGIC_PREFIX.length) {
    throw new Error("Payload too short");
  }

  const S = new Array(61);
  let seedAcc = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    seedAcc = Math.imul(seedAcc ^ seed.charCodeAt(i), 0x1000193) >>> 0;
  }

  let n = scramble(
    scramble(seedAcc) ^ scramble((Number(mediaId) >>> 0) ^ 0x9e3779b9)
  ) >>> 0;

  for (let e = 0; e < 8; e++) {
    if (((e * (e + 1)) & 1) === 0) {
      const a = n % 61;
      n = rotR((n + 0x9e3779b9) >>> 0, 7 + (7 & e));
      S[a] = (n ^ scramble(n)) >>> 0;
      n = scramble((n + a) >>> 0);
    } else {
      S[e] = D_CONSTANTS[15 & e];
    }
  }

  let acc = scramble(0xa5a5a5a5 ^ n) >>> 0;
  const keyStream = new Uint8Array(tLen);
  let l = 0;

  for (let e = 0; e < tLen;) {
    const sD = acc % 61;
    const sI = 0 - Number(sD in S);
    const sR = S[sD] >>> 0;
    const sC = Math.imul(0x9e3779b9, l + 1) >>> 0;
    let sB = (((acc ^ ((sR ^ sC) >>> 0)) >>> 0) | (acc & (sR ^ sC) & sI)) >>> 0;
    sB = (rotR((sB + acc) >>> 0, 31 & sD) ^ rotR(acc, 31 & Math.imul(sD, 7))) >>> 0;
    acc = scramble((sB + 0x9e3779b9) >>> 0);
    S[sD] = acc >>> 0;
    l++;

    keyStream[e++] = 255 & acc;
    if (e < tLen) keyStream[e++] = (acc >>> 8) & 255;
    if (e < tLen) keyStream[e++] = (acc >>> 16) & 255;
    if (e < tLen) keyStream[e++] = (acc >>> 24) & 255;
  }

  const decrypted = new Uint8Array(tLen);
  for (let e = 0; e < tLen; e++) {
    decrypted[e] = rawBytes[e] ^ keyStream[e];
  }

  for (let e = 0; e < MAGIC_PREFIX.length; e++) {
    if (decrypted[e] !== MAGIC_PREFIX[e]) {
      throw new Error("Invalid decrypted magic");
    }
  }

  const body = decrypted.subarray(MAGIC_PREFIX.length);
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(body);
  }
  return String.fromCharCode.apply(null, Array.from(body));
}

function extractQuality(q: string | undefined): string | undefined {
  if (!q) return undefined;
  const str = String(q).toLowerCase();
  if (str.includes("2160") || str.includes("4k")) return "2160";
  if (str.includes("1080")) return "1080";
  if (str.includes("800")) return "1080";
  if (str.includes("720")) return "720";
  if (str.includes("480")) return "480";
  if (str.includes("360")) return "360";
  return undefined;
}

let cachedSeed: { seed: string; expiresAt: number; mediaId: string } | null = null;

async function fetchSeed(
  axios: any,
  headers: any,
  mediaId: string,
  signal?: AbortSignal
): Promise<string | null> {
  const now = Date.now();
  if (
    cachedSeed &&
    cachedSeed.mediaId === mediaId &&
    cachedSeed.expiresAt - 5000 > now
  ) {
    return cachedSeed.seed;
  }

  try {
    const res = await axios.get(`${MOVY_API_BASE}/seed?mediaId=${mediaId}`, {
      headers,
      timeout: 3000,
      signal,
    });
    const s = res.data?.seed;
    if (s) {
      const ttl = res.data?.ttlMs || 30000;
      cachedSeed = { seed: s, expiresAt: now + ttl, mediaId };
      return s;
    }
  } catch {}
  return null;
}

export async function extractMovyStreams({
  tmdbId,
  imdbId,
  title,
  year,
  season,
  episode,
  type,
  providerContext,
  signal,
}: {
  tmdbId: string;
  imdbId?: string;
  title?: string;
  year?: string;
  season?: number | string;
  episode?: number | string;
  type: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<Stream[]> {
  const { axios, commonHeaders } = providerContext;
  const isMovie = type === "movie";

  if (!tmdbId) return [];

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Origin: ORIGIN,
    Referer: `${ORIGIN}/`,
    ...(commonHeaders || {}),
  };

  const seed = await fetchSeed(axios, headers, String(tmdbId), signal);
  if (!seed) return [];

  const streamHeaders = {
    Referer: `${ORIGIN}/`,
    Origin: ORIGIN,
    "User-Agent": headers["User-Agent"],
  };

  const queryParams: any = {
    title: encodeURIComponent(title || ""),
    mediaType: isMovie ? "movie" : "tv",
    year: year || "",
    tmdbId: String(tmdbId),
    enc: "2",
    seed,
  };

  if (imdbId) queryParams.imdbId = imdbId;
  if (!isMovie) {
    queryParams.seasonId = season || 1;
    queryParams.episodeId = episode || 1;
  }

  const streams: Stream[] = [];

  const tasks = MOVY_SERVERS.map(async (server) => {
    try {
      const res = await axios.get(`${MOVY_API_BASE}/${server.id}/sources`, {
        headers,
        params: queryParams,
        timeout: 4500,
        signal,
      });

      const cipherText =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      if (!cipherText || cipherText.length < 10) return;

      const rawJson = decodePayload(cipherText, seed, String(tmdbId));
      const parsed = JSON.parse(rawJson);

      const rawSubs = parsed.subtitles || [];
      const subtitles: TextTracks = rawSubs
        .filter((sub: any) => sub && (sub.url || sub.file || sub.src))
        .map((sub: any) => {
          const u = sub.url || sub.file || sub.src;
          const lang = sub.language || sub.lang || sub.label || sub.name || "en";
          return {
            title: lang,
            language: lang.slice(0, 2).toLowerCase(),
            type: u.endsWith(".srt") ? "application/x-subrip" : "text/vtt",
            uri: u,
          };
        });

      if (parsed.playlist) {
        streams.push({
          server: server.displayName,
          link: parsed.playlist,
          type: "m3u8",
          quality: server.mayHave4K ? "2160" : "1080",
          subtitles: subtitles.length ? subtitles : undefined,
          headers: streamHeaders,
        });
      }

      if (Array.isArray(parsed.sources)) {
        for (const src of parsed.sources) {
          if (!src || !src.url) continue;
          const isMaster = src.url === parsed.playlist;
          if (isMaster) continue;

          const q = extractQuality(src.quality) || server.quality;
          const isM3u8 = src.url.includes(".m3u8");
          const label = src.quality
            ? `${server.displayName} (${src.quality})`
            : server.displayName;

          streams.push({
            server: label,
            link: src.url,
            type: isM3u8 ? "m3u8" : "mp4",
            quality: q,
            subtitles: subtitles.length ? subtitles : undefined,
            headers: streamHeaders,
          });
        }
      }
    } catch {
      // Skip server on failure or timeout
    }
  });

  await Promise.allSettled(tasks);
  return streams;
}
