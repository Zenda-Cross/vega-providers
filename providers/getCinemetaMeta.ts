import { EpisodeLink, Info, ProviderContext } from "./types";

export type CinemetaVideo = {
  id?: string;
  name?: string;
  season?: number;
  number?: number;
  episode?: number;
  overview?: string;
  description?: string;
  thumbnail?: string;
  released?: string;
  firstAired?: string;
};

export type CinemetaMeta = {
  imdb_id?: string;
  name?: string;
  type?: string;
  description?: string;
  background?: string;
  poster?: string;
  logo?: string;
  genre?: string[];
  genres?: string[];
  cast?: string[];
  imdbRating?: string;
  moviedb_id?: number;
  year?: number | string;
  videos?: CinemetaVideo[];
};

type CinemetaCache = Record<string, CinemetaMeta | Promise<CinemetaMeta | null>>;

type CinemetaState = {
  __vegaCinemetaCache__?: CinemetaCache;
};

declare const providerGlobal: CinemetaState | undefined;

const CINEMETA_BASE_URL = "https://v3-cinemeta.strem.io/meta";
const CONTEXT_KEY = "cinemetaMeta";

function isCinemetaPromise(
  value: CinemetaMeta | Promise<CinemetaMeta | null>,
): value is Promise<CinemetaMeta | null> {
  return typeof (value as Promise<CinemetaMeta | null>).then === "function";
}

function getCache(): CinemetaCache {
  const state =
    typeof providerGlobal !== "undefined" && providerGlobal
      ? providerGlobal
      : (globalThis as typeof globalThis & CinemetaState);

  if (
    !state.__vegaCinemetaCache__ ||
    typeof state.__vegaCinemetaCache__ !== "object"
  ) {
    state.__vegaCinemetaCache__ = Object.create(null) as CinemetaCache;
  }
  return state.__vegaCinemetaCache__;
}

async function resolveTmdbToImdb(
  tmdbId: string,
  type: string,
  providerContext: ProviderContext,
): Promise<string | null> {
  try {
    const tmdbType = type === "series" ? "tv" : "movie";
    const res = await providerContext.axios.get(
      `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/external_ids?api_key=cfe422613b250f702980a3bbf9e90716`,
      { timeout: 5000 },
    );
    const imdb = res.data?.imdb_id;
    if (typeof imdb === "string" && /^tt\d+$/.test(imdb)) {
      return imdb;
    }
  } catch {
    // Ignore TMDb resolution errors
  }
  return null;
}

export async function getCinemetaMeta(
  id: string | undefined | null,
  type: string,
  providerContext: ProviderContext,
): Promise<CinemetaMeta | null> {
  if (!id || typeof id !== "string") {
    return null;
  }

  let cleanImdbId = id.match(/tt\d+/)?.[0];

  // If not an IMDb ID, check if it's a TMDb ID or TMDb URL
  if (!cleanImdbId) {
    const tmdbMatch =
      id.match(/(?:themoviedb\.org\/(?:movie|tv)\/|tmdb:?)(\d+)/i) ||
      id.match(/^(\d+)$/);
    if (tmdbMatch) {
      cleanImdbId = (await resolveTmdbToImdb(tmdbMatch[1], type, providerContext)) || undefined;
    }
  }

  if (!cleanImdbId) {
    return null;
  }

  const cache = getCache();
  const cached = cache[cleanImdbId];
  if (cached) {
    if (isCinemetaPromise(cached)) {
      return cached;
    }
    if (cached.name && cached.imdb_id === cleanImdbId) {
      return cached;
    }
    delete cache[cleanImdbId];
  }

  const mediaType = type === "series" ? "series" : "movie";
  const url = `${CINEMETA_BASE_URL}/${mediaType}/${cleanImdbId}.json`;
  const request = providerContext.axios
    .get(url, { timeout: 8000 })
    .then((response) => {
      const meta = response.data?.meta as CinemetaMeta | undefined;
      if (!meta?.name || meta.imdb_id !== cleanImdbId) {
        delete cache[cleanImdbId];
        return null;
      }
      cache[cleanImdbId] = meta;
      return meta;
    })
    .catch(() => {
      delete cache[cleanImdbId];
      return null;
    });

  cache[cleanImdbId] = request;
  return request;
}

export function applyCinemetaMeta(info: Info, meta?: CinemetaMeta | null): Info {
  if (!meta) return info;
  return {
    ...info,
    title: meta.name || info.title,
    image: meta.background || meta.poster || info.image,
    poster: meta.poster || info.poster,
    logo: meta.logo || undefined,
    synopsis: meta.description || info.synopsis,
    imdbId: meta.imdb_id || info.imdbId || "",
    tmdbId: meta.moviedb_id?.toString() || info.tmdbId || undefined,
    type: meta.type || info.type,
    tags: meta.genres || meta.genre || undefined,
    cast: meta.cast || undefined,
    rating: meta.imdbRating || undefined,
  };
}

export function getCinemetaSeason(value: string): number | undefined {
  if (
    /\bseason\s*:?\s*\d{1,2}\s*[-–&/]\s*(?:season\s*:?\s*)?\d{1,2}\b/i.test(
      value,
    )
  ) {
    return undefined;
  }
  const matches = [
    ...value.matchAll(/\bseason\s*:?\s*(\d{1,2})\b/gi),
    ...value.matchAll(/\bs(\d{1,2})(?=\s*e\d|\b)/gi),
  ].map((match) => Number(match[1]));
  const seasons = [...new Set(matches.filter((season) => season > 0))];
  return seasons.length === 1 ? seasons[0] : undefined;
}

export function addCinemetaContext(
  url: string,
  imdbId: string,
  season: number,
): string {
  const parsedUrl = new URL(url);
  parsedUrl.hash = `${CONTEXT_KEY}=${encodeURIComponent(
    JSON.stringify({ imdbId, season }),
  )}`;
  return parsedUrl.href;
}

export function readCinemetaContext(url: string): {
  requestUrl: string;
  imdbId?: string;
  season?: number;
} {
  const parsedUrl = new URL(url);
  const encoded = new URLSearchParams(parsedUrl.hash.slice(1)).get(CONTEXT_KEY);
  parsedUrl.hash = "";
  if (!encoded) return { requestUrl: parsedUrl.href };

  try {
    const context = JSON.parse(decodeURIComponent(encoded));
    if (/^tt\d+$/.test(context.imdbId) && Number.isInteger(context.season)) {
      return {
        requestUrl: parsedUrl.href,
        imdbId: context.imdbId,
        season: context.season,
      };
    }
  } catch {
    return { requestUrl: parsedUrl.href };
  }
  return { requestUrl: parsedUrl.href };
}

export function formatEpisodeTitle(
  episode: number | string,
  name?: string,
): string {
  const epNum = Number(episode);
  if (!name || !name.trim()) {
    return `Episode ${episode}`;
  }
  let cleanName = name.trim();
  cleanName = cleanName.replace(/^(?:s\d+\s*e\d+|\d+x\d+)\s*[:.-]\s*/i, "");
  cleanName = cleanName.replace(
    new RegExp(`^episodes?\\s*0*${epNum}\\s*[:.-]\\s*`, "i"),
    "",
  );

  if (new RegExp(`^0*${epNum}\\s*\\.\\s*`, "i").test(cleanName)) {
    return cleanName;
  }
  if (new RegExp(`^0*${epNum}\\s*[:.-]\\s*`, "i").test(cleanName)) {
    return `${epNum}. ${cleanName.replace(new RegExp(`^0*${epNum}\\s*[:.-]\\s*`, "i"), "")}`;
  }
  if (new RegExp(`^episodes?\\s*0*${epNum}$`, "i").test(cleanName)) {
    return `Episode ${epNum}`;
  }
  return `${epNum}. ${cleanName}`;
}

export function getEpisodeNumber(title: string, season: number): number | undefined {
  if (
    /\b(?:e\d+|episodes?\s*:?\s*\d+)\s*(?:[-–,&/]|\band\b)\s*(?:e|episodes?\s*:?\s*)?\d+/i.test(
      title,
    )
  ) {
    return undefined;
  }

  const explicitSeasons = [
    ...title.matchAll(/\bseason\s*:?\s*(\d{1,2})\b/gi),
    ...title.matchAll(/\bs(\d{1,2})\s*e\d{1,3}\b/gi),
  ].map((match) => Number(match[1]));
  if (explicitSeasons.some((value) => value !== season)) return undefined;

  const matches = [
    ...title.matchAll(/\bs\d{1,2}\s*e(\d{1,3})\b/gi),
    ...title.matchAll(/\bepisodes?\s*:?\s*(\d{1,3})\b/gi),
    ...title.matchAll(/\bep\s*\.?:?\s*(\d{1,3})\b/gi),
    ...title.matchAll(/\be(\d{1,3})\b/gi),
    ...title.matchAll(/^\s*(\d{1,3})\s*[.:-]\s*/gi),
  ].map((match) => Number(match[1]));
  const episodes = [...new Set(matches.filter((episode) => episode > 0))];
  return episodes.length === 1 ? episodes[0] : undefined;
}

export function enrichCinemetaEpisodes<T extends EpisodeLink>(
  episodes: T[],
  videos?: CinemetaVideo[] | null,
  season?: number,
): T[] {
  if (!videos || !Array.isArray(videos) || videos.length === 0 || !season) {
    return episodes;
  }
  const videosByEpisode = new Map<number, CinemetaVideo>();
  let hasDuplicateVideo = false;
  for (const video of videos) {
    const episode = video.episode ?? video.number;
    if (video.season !== season || !episode) continue;
    if (videosByEpisode.has(episode)) {
      hasDuplicateVideo = true;
      continue;
    }
    videosByEpisode.set(episode, video);
  }

  const matched = episodes.map((episode) => {
    const episodeNumber = getEpisodeNumber(episode.title, season);
    const video = episodeNumber
      ? videosByEpisode.get(episodeNumber)
      : undefined;
    const description = video?.description || video?.overview;
    return { episode, episodeNumber, video, description };
  });
  const numbers = matched.map(({ episodeNumber }) => episodeNumber);
  const allMatched =
    episodes.length > 0 &&
    !hasDuplicateVideo &&
    matched.every(({ video }) => Boolean(video)) &&
    new Set(numbers).size === numbers.length;
  if (!allMatched) return episodes;

  return matched.map(({ episode, video, description }) => ({
    ...episode,
    description: description || episode.description,
    image: video?.thumbnail || episode.image,
  }));
}
