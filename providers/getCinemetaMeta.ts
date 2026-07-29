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

type CinemetaState = {
  __vegaCinemetaCache__?: Map<string, Promise<CinemetaMeta>>;
};

declare const providerGlobal: CinemetaState | undefined;

const CINEMETA_BASE_URL = "https://v3-cinemeta.strem.io/meta";
const CONTEXT_KEY = "cinemetaMeta";

function getCache(): Map<string, Promise<CinemetaMeta>> {
  const state =
    typeof providerGlobal !== "undefined" && providerGlobal
      ? providerGlobal
      : (globalThis as typeof globalThis & CinemetaState);

  state.__vegaCinemetaCache__ ??= new Map();
  return state.__vegaCinemetaCache__;
}

export function getCinemetaMeta(
  imdbId: string,
  type: string,
  providerContext: ProviderContext,
): Promise<CinemetaMeta> {
  if (!/^tt\d+$/.test(imdbId)) {
    return Promise.reject(new Error(`Invalid IMDb ID: ${imdbId}`));
  }

  const cache = getCache();
  const cached = cache.get(imdbId);
  if (cached) return cached;

  const mediaType = type === "series" ? "series" : "movie";
  const url = `${CINEMETA_BASE_URL}/${mediaType}/${imdbId}.json`;
  const request = providerContext.axios
    .get(url)
    .then((response) => {
      const meta = response.data?.meta as CinemetaMeta | undefined;
      if (!meta?.name || meta.imdb_id !== imdbId) {
        throw new Error(`Cinemeta returned invalid metadata for ${imdbId}`);
      }
      return meta;
    })
    .catch((error) => {
      cache.delete(imdbId);
      throw error;
    });

  cache.set(imdbId, request);
  return request;
}

export function applyCinemetaMeta(info: Info, meta: CinemetaMeta): Info {
  return {
    ...info,
    title: meta.name || info.title,
    image: meta.background || meta.poster || info.image,
    logo: meta.logo || undefined,
    synopsis: meta.description || info.synopsis,
    imdbId: "",
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

function getEpisodeNumber(title: string, season: number): number | undefined {
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
  ].map((match) => Number(match[1]));
  const episodes = [...new Set(matches.filter((episode) => episode > 0))];
  return episodes.length === 1 ? episodes[0] : undefined;
}

export function enrichCinemetaEpisodes<T extends EpisodeLink>(
  episodes: T[],
  videos: CinemetaVideo[],
  season: number,
): T[] {
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
    matched.every(({ video, description }) =>
      Boolean(video && description && video.thumbnail),
    ) &&
    new Set(numbers).size === numbers.length;
  if (!allMatched) return episodes;

  return matched.map(({ episode, video, description }) => ({
    ...episode,
    description,
    image: video?.thumbnail,
  }));
}
