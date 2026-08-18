import { Stream, ProviderContext, TextTracks } from "../types";

const VIDEASY_API_BASE = "https://api.speedracelight.com";
const DECRYPTION_API_URL = "https://enc-dec.app/api/dec-videasy";
const ORIGIN = "https://www.cineby.at";

export interface VideasyServer {
  displayName: string;
  path: string;
  mayHave4K?: boolean;
  audioLabel?: string;
  qualityFilter?: string;
  language?: string;
}

export const VIDEASY_SERVERS: VideasyServer[] = [
  { displayName: "Yoru", path: "cdn", mayHave4K: true, audioLabel: "Original" },
  { displayName: "Cypher", path: "downloader2", audioLabel: "Original" },
  { displayName: "Breach", path: "m4uhd", audioLabel: "Original" },
  { displayName: "Neon", path: "vsrc", audioLabel: "Original" },
  { displayName: "Vyse", path: "hdmovie", qualityFilter: "English", audioLabel: "Original" },
  { displayName: "Killjoy", path: "meine", language: "german", audioLabel: "German" },
  { displayName: "Fade", path: "hdmovie", qualityFilter: "Hindi", audioLabel: "Hindi" },
  { displayName: "Omen", path: "lamovie", audioLabel: "Spanish" },
  { displayName: "Raze", path: "superflix", audioLabel: "Portuguese" },
];

function pctEncode(s: string): string {
  const bytes = Buffer.from(s, "utf8");
  let out = "";
  const HEX = "0123456789ABCDEF";
  for (const b of bytes) {
    const unreserved =
      (b >= 0x30 && b <= 0x39) ||
      (b >= 0x41 && b <= 0x5a) ||
      (b >= 0x61 && b <= 0x7a) ||
      b === 0x2d || b === 0x2e || b === 0x5f || b === 0x7e;
    if (unreserved) {
      out += String.fromCharCode(b);
    } else {
      out += "%" + HEX[(b >> 4) & 0x0f] + HEX[b & 0x0f];
    }
  }
  return out;
}

const doubleEncode = (s: string) => pctEncode(pctEncode(s));

function extractQuality(q: string | undefined): "360" | "480" | "720" | "1080" | "2160" | undefined {
  if (!q) return undefined;
  const str = String(q).toLowerCase();
  if (str.includes("2160") || str.includes("4k")) return "2160";
  if (str.includes("1080")) return "1080";
  if (str.includes("720")) return "720";
  if (str.includes("480")) return "480";
  if (str.includes("360")) return "360";
  return undefined;
}

export const getStream = async ({
  link: id,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> => {
  try {
    const streams: Stream[] = [];
    const payload = (() => {
      try {
        return JSON.parse(id);
      } catch {
        return { tmdbId: id };
      }
    })();

    let tmdbId: string = String(payload.tmdbId ?? payload.id ?? payload.tmdId ?? "");
    let imdbId: string = payload.imdbId ?? "";
    const season: string | number = payload.season || 1;
    const episode: string | number = payload.episode || 1;
    const effectiveType: string = payload.type ?? type ?? "movie";
    const isMovie = effectiveType === "movie";
    let title: string = payload.title ?? "";
    let year: string = (payload.year ? String(payload.year) : "").slice(0, 4);

    // If tmdbId or title/year is missing, resolve via Cinemeta or TMDb proxy
    if (!tmdbId && imdbId) {
      try {
        const cinemetaUrl = `https://v3-cinemeta.strem.io/meta/${
          isMovie ? "movie" : "series"
        }/${imdbId}.json`;
        const cRes = await providerContext.axios.get(cinemetaUrl, {
          headers: providerContext.commonHeaders,
          timeout: 8000,
        });
        const cMeta = cRes.data?.meta;
        if (cMeta) {
          tmdbId = String(cMeta.moviedb_id || "");
          if (!title) title = cMeta.name || "";
          if (!year) year = String(cMeta.year || "").slice(0, 4);
        }
      } catch {
        // ignore fallback error
      }
    }

    if (tmdbId && (!title || !year)) {
      try {
        const detailUrl = `https://db.speedracelight.com/3/${
          isMovie ? "movie" : "tv"
        }/${tmdbId}?append_to_response=external_ids`;
        const dRes = await providerContext.axios.get(detailUrl, {
          headers: {
            Referer: `${ORIGIN}/`,
            Origin: ORIGIN,
            ...providerContext.commonHeaders,
          },
          timeout: 8000,
        });
        const dData = dRes.data;
        if (dData) {
          if (!title) title = dData.title || dData.name || "";
          if (!year) {
            year = (dData.release_date || dData.first_air_date || "").slice(
              0,
              4
            );
          }
          if (!imdbId) imdbId = dData.external_ids?.imdb_id || "";
        }
      } catch {
        // ignore fallback error
      }
    }

    if (!tmdbId) {
      return [];
    }

    const backendHeaders = {
      Referer: `${ORIGIN}/`,
      Origin: ORIGIN,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };

    // Get seed for mediaId
    const seedRes = await providerContext.axios.get(
      `${VIDEASY_API_BASE}/seed?mediaId=${tmdbId}`,
      { headers: backendHeaders, timeout: 10000 }
    );
    const seed = seedRes.data?.seed;
    if (!seed) {
      return [];
    }

    const tasks = VIDEASY_SERVERS.map(async (server) => {
      try {
        let serverUrl = `${VIDEASY_API_BASE}/${server.path}/sources-with-title?title=${doubleEncode(
          title
        )}&mediaType=${isMovie ? "movie" : "tv"}&year=${year}&episodeId=${episode}&seasonId=${season}&tmdbId=${tmdbId}&enc=2&seed=${seed}`;
        if (imdbId) serverUrl += `&imdbId=${imdbId}`;
        if (server.language) serverUrl += `&language=${server.language}`;

        const encRes = await providerContext.axios.get(serverUrl, {
          headers: backendHeaders,
          timeout: 8000,
        });

        const encText =
          typeof encRes.data === "string"
            ? encRes.data
            : JSON.stringify(encRes.data);
        if (!encText || encText.length < 5) return;

        const decRes = await providerContext.axios.post(
          DECRYPTION_API_URL,
          {
            text: encText,
            id: String(tmdbId),
            seed: seed,
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 8000,
          }
        );

        const result = decRes.data?.result;
        if (!result) return;

        const subtitles: TextTracks = (result.subtitles || [])
          .map((sub: any) => {
            const u = sub.url || sub.file || sub.src;
            const lang =
              sub.language || sub.lang || sub.label || sub.name || "Unknown";
            if (!u) return null;
            return {
              title: lang,
              language: lang.slice(0, 2).toLowerCase(),
              type: u.endsWith(".srt")
                ? ("application/x-subrip" as const)
                : ("text/vtt" as const),
              uri: u,
            };
          })
          .filter(Boolean) as TextTracks;

        const videoHeaders = {
          Referer: `${ORIGIN}/`,
          Origin: ORIGIN,
        };

        if (result.sources && result.sources.length > 0) {
          let sources = result.sources;
          if (server.qualityFilter) {
            sources = sources.filter(
              (s: any) =>
                s.quality &&
                s.quality.toLowerCase() === server.qualityFilter!.toLowerCase()
            );
          }
          sources.forEach((src: any) => {
            const q = extractQuality(src.quality);
            const serverLabel = `${server.displayName} (${
              server.audioLabel || "Original"
            })`;
            streams.push({
              server: serverLabel,
              link: src.url,
              type: src.url.includes(".m3u8") ? "m3u8" : "mp4",
              quality: q,
              subtitles: subtitles.length > 0 ? subtitles : undefined,
              headers: videoHeaders,
            });
          });
        } else if (result.url) {
          streams.push({
            server: `${server.displayName} (${
              server.audioLabel || "Original"
            })`,
            link: result.url,
            type: "m3u8",
            subtitles: subtitles.length > 0 ? subtitles : undefined,
            headers: videoHeaders,
          });
        } else if (result.streams) {
          for (const [qStr, sUrl] of Object.entries(result.streams)) {
            streams.push({
              server: `${server.displayName} (${
                server.audioLabel || "Original"
              })`,
              link: sUrl as string,
              type: (sUrl as string).includes(".m3u8") ? "m3u8" : "mp4",
              quality: extractQuality(qStr),
              subtitles: subtitles.length > 0 ? subtitles : undefined,
              headers: videoHeaders,
            });
          }
        }
      } catch {
        // Ignore individual server failures
      }
    });

    await Promise.allSettled(tasks);
    return streams;
  } catch (err) {
    console.error("autoEmbed getStream error:", err);
    return [];
  }
};
