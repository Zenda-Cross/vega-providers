import { Stream, ProviderContext, TextTracks } from "../types";
import { decryptStreamPayload } from "./crypto";

const CORE_BASE = "https://core.vidzee.wtf";

interface StreamRequestParams {
  id: string;
  type: string;
  season?: number;
  episode?: number;
}

function parseStreamLink(link: string, defaultType: string): StreamRequestParams {
  try {
    if (link.startsWith("{")) {
      const parsed = JSON.parse(link);
      return {
        id: String(parsed.id),
        type: parsed.type || defaultType,
        season: parsed.season ? Number(parsed.season) : undefined,
        episode: parsed.episode ? Number(parsed.episode) : undefined,
      };
    }
    const u = new URL(link);
    const id = u.searchParams.get("id") || "";
    const type = u.searchParams.get("type") || defaultType;
    const season = u.searchParams.get("season")
      ? Number(u.searchParams.get("season"))
      : undefined;
    const episode = u.searchParams.get("episode")
      ? Number(u.searchParams.get("episode"))
      : undefined;
    return { id, type, season, episode };
  } catch {
    const idMatch = link.match(/id=([^&]+)/);
    const typeMatch = link.match(/type=([^&]+)/);
    const sMatch = link.match(/season=([^&]+)/);
    const eMatch = link.match(/episode=([^&]+)/);
    return {
      id: idMatch ? idMatch[1] : link,
      type: typeMatch ? typeMatch[1] : defaultType,
      season: sMatch ? Number(sMatch[1]) : undefined,
      episode: eMatch ? Number(eMatch[1]) : undefined,
    };
  }
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const parsed = parseStreamLink(link, type);
  const isMovie = parsed.type === "movie";
  const season = parsed.season || 1;
  const episode = parsed.episode || 1;

  // 1. Fetch Subtitles in parallel
  let subtitles: TextTracks = [];
  const subsEndpoint = isMovie
    ? `${CORE_BASE}/subs/movie/${parsed.id}`
    : `${CORE_BASE}/subs/tv/${parsed.id}/${season}/${episode}`;

  try {
    const subsResponse = await axios.get(subsEndpoint, {
      signal,
      timeout: 8000,
      headers: {
        ...providerContext.commonHeaders,
        Referer: "https://player.vidzee.wtf/",
        Origin: "https://player.vidzee.wtf",
      },
    });

    if (Array.isArray(subsResponse.data)) {
      subtitles = subsResponse.data.map((sub: any) => ({
        title: sub.label || "Unknown",
        language: sub.label || "en",
        type: "text/vtt",
        uri: sub.file,
      }));
    }
  } catch {
    // Continue even if subtitles fail
  }

  // 2. Fetch Streams from primary Vidzee servers
  const servers = [
    { id: "dcloud", name: "FastCloud (Main)" },
    { id: "tik", name: "TikCloud (Backup)" },
  ];

  const streams: Stream[] = [];

  for (const s of servers) {
    try {
      const streamEndpoint = isMovie
        ? `${CORE_BASE}/streams/movie/${parsed.id}?s=${s.id}&e=1`
        : `${CORE_BASE}/streams/tv/${parsed.id}/${season}/${episode}?s=${s.id}&e=1`;

      const res = await axios.get(streamEndpoint, {
        signal,
        timeout: 10000,
        headers: {
          ...providerContext.commonHeaders,
          Referer: "https://player.vidzee.wtf/",
          Origin: "https://player.vidzee.wtf",
        },
      });

      let streamUrl: string | undefined = res.data?.url;
      const encrypted = res.data?.c;
      if (!streamUrl && encrypted) {
        const decrypted = await decryptStreamPayload(encrypted);
        if (decrypted?.url) {
          streamUrl = decrypted.url;
        }
      }

      if (streamUrl) {
        streams.push({
          server: s.name,
          link: streamUrl,
          type: "m3u8",
          quality: "1080",
          headers: {
            Referer: "https://player.vidzee.wtf/",
            Origin: "https://player.vidzee.wtf",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          subtitles: subtitles.length > 0 ? subtitles : undefined,
        });
      }
    } catch {
      // Continue to next server
    }
  }

  return streams;
};
