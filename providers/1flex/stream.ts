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
    let id = u.searchParams.get("id") || "";
    let type = u.searchParams.get("type") || defaultType;
    let season = u.searchParams.get("season")
      ? Number(u.searchParams.get("season"))
      : undefined;
    let episode = u.searchParams.get("episode")
      ? Number(u.searchParams.get("episode"))
      : undefined;

    if (!id && u.pathname) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "movie" || parts[0] === "tv") {
        type = parts[0];
        id = parts[1] || "";
        if (parts[2]) season = Number(parts[2]);
        if (parts[3]) episode = Number(parts[3]);
      } else if (parts.length > 0) {
        id = parts[parts.length - 1];
      }
    }
    return { id, type, season, episode };
  } catch {
    const idMatch = link.match(/id=([^&]+)/);
    const typeMatch = link.match(/type=([^&]+)/);
    const sMatch = link.match(/season=([^&]+)/);
    const eMatch = link.match(/episode=([^&]+)/);
    const pathMatch = link.match(/\/(movie|tv)\/(\d+)(?:\/(\d+)\/(\d+))?/);
    return {
      id: idMatch ? idMatch[1] : pathMatch ? pathMatch[2] : link,
      type: typeMatch ? typeMatch[1] : pathMatch ? pathMatch[1] : defaultType,
      season: sMatch
        ? Number(sMatch[1])
        : pathMatch && pathMatch[3]
        ? Number(pathMatch[3])
        : undefined,
      episode: eMatch
        ? Number(eMatch[1])
        : pathMatch && pathMatch[4]
        ? Number(pathMatch[4])
        : undefined,
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

  const headers = {
    ...providerContext.commonHeaders,
    Referer: "https://player.vidzee.wtf/",
    Origin: "https://player.vidzee.wtf",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  // 1. Subtitles task
  const subsEndpoint = isMovie
    ? `${CORE_BASE}/subs/movie/${parsed.id}`
    : `${CORE_BASE}/subs/tv/${parsed.id}/${season}/${episode}`;

  const subsPromise = axios
    .get(subsEndpoint, { signal, timeout: 6000, headers })
    .then((res: any) => {
      if (Array.isArray(res.data)) {
        return res.data.map((sub: any) => ({
          title: sub.label || "Unknown",
          language: sub.label || "en",
          type: "text/vtt",
          uri: sub.file,
        })) as TextTracks;
      }
      return [] as TextTracks;
    })
    .catch(() => [] as TextTracks);

  // 2. Servers to query in parallel
  const servers = [
    { id: "dcloud", name: "FastCloud (Main)" },
    { id: "tik", name: "TikCloud (Backup)" },
  ];

  const fetchServerStream = async (s: { id: string; name: string }) => {
    try {
      const streamEndpoint = isMovie
        ? `${CORE_BASE}/streams/movie/${parsed.id}?s=${s.id}&e=1`
        : `${CORE_BASE}/streams/tv/${parsed.id}/${season}/${episode}?s=${s.id}&e=1`;

      const res = await axios.get(streamEndpoint, {
        signal,
        timeout: 8000,
        headers,
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
        return {
          server: s.name,
          link: streamUrl,
          type: "m3u8" as const,
          quality: "1080",
          headers: {
            Referer: "https://player.vidzee.wtf/",
            Origin: "https://player.vidzee.wtf",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        };
      }
    } catch {
      // server failed
    }
    return null;
  };

  const [subtitles, ...rawStreams] = await Promise.all([
    subsPromise,
    ...servers.map((s) => fetchServerStream(s)),
  ]);

  const validStreams = rawStreams.filter(
    (s): s is NonNullable<typeof s> => s !== null
  );

  return validStreams.map((s) => ({
    ...s,
    subtitles: subtitles.length > 0 ? subtitles : undefined,
  }));
};
