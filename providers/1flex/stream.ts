import { Stream, ProviderContext, TextTracks } from "../types";
import { decryptStreamPayload, extractVidukiStreams } from "./crypto";
import { extractCinejoyStreams } from "../extractors/cinejoy";
import { extractMovyStreams } from "../extractors/movy";
import { extractVidstuckStreams } from "../extractors/vidstuck";

const CORE_BASE = "https://core.vidzee.wtf";
const DB_BASE = "https://db.1flex.org";

interface StreamRequestParams {
  id: string;
  type: string;
  season?: number;
  episode?: number;
  title?: string;
  year?: string;
  imdbId?: string;
}

function parseStreamLink(link: string, defaultType: string): StreamRequestParams {
  try {
    if (link.startsWith("{")) {
      const parsed = JSON.parse(link);
      return {
        id: String(parsed.id || parsed.tmdbId || ""),
        type: parsed.type || defaultType,
        season: parsed.season ? Number(parsed.season) : undefined,
        episode: parsed.episode ? Number(parsed.episode) : undefined,
        title: parsed.title,
        year: parsed.year ? String(parsed.year).slice(0, 4) : undefined,
        imdbId: parsed.imdbId,
      };
    }
    const u = new URL(link);
    let id = u.searchParams.get("id") || u.searchParams.get("tmdbId") || "";
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
    const idMatch = link.match(/(?:id|tmdbId)=([^&]+)/);
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
  const tmdbId = parsed.id;
  const isMovie = parsed.type === "movie";
  const season = parsed.season || 1;
  const episode = parsed.episode || 1;
  const effectiveType = parsed.type || "movie";

  const headers = {
    ...providerContext.commonHeaders,
    Referer: "https://player.vidzee.wtf/",
    Origin: "https://player.vidzee.wtf",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  // 1. Fetch metadata in background (only needed for third-party scrapers)
  let title = parsed.title || "";
  let year = parsed.year || "";
  let imdbId = parsed.imdbId || "";
  let releaseDate = "";

  const metaPromise = (async () => {
    if (tmdbId && (!title || !year || !imdbId)) {
      try {
        const metaUrl = `${DB_BASE}/${isMovie ? "movie" : "tv"}/${tmdbId}`;
        const res = await axios.get(metaUrl, {
          signal,
          timeout: 2000,
          headers: {
            ...providerContext.commonHeaders,
            Referer: "https://www.1flex.org/",
            Origin: "https://www.1flex.org",
          },
        });
        const d = res.data;
        if (d) {
          if (!title) title = d.title || d.name || "";
          if (!year) year = (d.release_date || d.first_air_date || "").slice(0, 4);
          if (!imdbId && d.imdb_id) imdbId = d.imdb_id;
          if (!releaseDate) releaseDate = d.release_date || d.first_air_date || "";
        }
      } catch {}
    }
  })();

  // 2. Subtitles in parallel
  const subsEndpoint = isMovie
    ? `${CORE_BASE}/subs/movie/${tmdbId}`
    : `${CORE_BASE}/subs/tv/${tmdbId}/${season}/${episode}`;

  const subsPromise = axios
    .get(subsEndpoint, { signal, timeout: 2000, headers })
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

  // 3. Native Viduki streams (Fastest, direct player backend)
  const vidukiPromise = extractVidukiStreams({
    tmdbId,
    season: Number(season),
    episode: Number(episode),
    isMovie,
    axios,
    signal,
  })
    .then((vStreams) =>
      vStreams.map((v) => ({
        server: v.server,
        link: v.url,
        type: v.type,
        quality: v.quality,
        headers: v.headers,
      }))
    )
    .catch(() => [] as Stream[]);

  // 4. Native Vidzee streams (FastCloud)
  const vidzeeServers = [
    { id: "dcloud", name: "1Flex - FastCloud (1080p)" },
    { id: "tik", name: "1Flex - TikCloud (Backup)" },
  ];

  const fetchVidzeeServerStream = async (s: { id: string; name: string }) => {
    try {
      const streamEndpoint = isMovie
        ? `${CORE_BASE}/streams/movie/${tmdbId}?s=${s.id}&e=1`
        : `${CORE_BASE}/streams/tv/${tmdbId}/${season}/${episode}?s=${s.id}&e=1`;

      const res = await axios.get(streamEndpoint, {
        signal,
        timeout: 2500,
        headers,
      });

      let streamUrl: string | undefined = res.data?.url;
      const encrypted = res.data?.c;
      if (!streamUrl && encrypted) {
        const decrypted = await decryptStreamPayload(encrypted);
        if (decrypted?.url) streamUrl = decrypted.url;
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
    } catch {}
    return null;
  };

  const vidzeePromise = Promise.all(
    vidzeeServers.map((s) => fetchVidzeeServerStream(s))
  ).then((res) => res.filter((s): s is NonNullable<typeof s> => s !== null));

  // 5. Fallback scrapers (Cinejoy, Movy, Vidstuck)
  const fallbackScrapersPromise = (async () => {
    await metaPromise.catch(() => {});
    const [cj, mv, vs] = await Promise.all([
      extractCinejoyStreams({
        tmdbId,
        season: Number(season),
        episode: Number(episode),
        type: effectiveType,
        providerContext,
        signal,
      }).catch(() => [] as Stream[]),
      extractMovyStreams({
        tmdbId,
        imdbId,
        title,
        year,
        season: Number(season),
        episode: Number(episode),
        type: effectiveType,
        providerContext,
        signal,
      }).catch(() => [] as Stream[]),
      extractVidstuckStreams({
        tmdbId,
        imdbId,
        title,
        year,
        date: releaseDate,
        season: Number(season),
        episode: Number(episode),
        type: effectiveType,
        providerContext,
        signal,
      }).catch(() => [] as Stream[]),
    ]);
    return [...(cj || []), ...(mv || []), ...(vs || [])];
  })();

  // Fast-Path: Await native high-speed streams (Viduki + Vidzee)
  const [subtitles, vidukiStreams, vidzeeStreams] = await Promise.all([
    subsPromise,
    vidukiPromise,
    vidzeePromise,
  ]);

  const nativeStreams: Stream[] = [
    ...(vidukiStreams || []),
    ...(vidzeeStreams || []),
  ];

  // If native streams are found, race a brief 1000ms window for fallback scrapers.
  // If native streams are not found, wait fully for fallback scrapers.
  let extraStreams: Stream[] = [];
  if (nativeStreams.length > 0) {
    const briefGracePeriod = new Promise<Stream[]>((resolve) =>
      setTimeout(() => resolve([]), 1000)
    );
    extraStreams = await Promise.race([fallbackScrapersPromise, briefGracePeriod]);
  } else {
    extraStreams = await fallbackScrapersPromise;
  }

  const allStreams = [...nativeStreams, ...(extraStreams || [])];

  return allStreams.map((s) => ({
    ...s,
    subtitles:
      s.subtitles && s.subtitles.length > 0
        ? s.subtitles
        : subtitles.length > 0
        ? subtitles
        : undefined,
  }));
};
