import { EpisodeLink, ProviderContext, SkipInterval } from "./types";
import { getEpisodeNumber } from "./getCinemetaMeta";

export interface TheIntroDbParams {
  imdbId?: string;
  tmdbId?: string | number;
  season?: number;
  episode?: number;
  providerContext: ProviderContext;
  signal?: AbortSignal;
  timeout?: number;
}

function getIntroDbCache(): Record<
  string,
  SkipInterval[] | Promise<SkipInterval[]>
> {
  const state: any =
    typeof providerGlobal !== "undefined" && providerGlobal
      ? providerGlobal
      : globalThis;
  if (
    !state.__vegaTheIntroDbCache__ ||
    typeof state.__vegaTheIntroDbCache__ !== "object"
  ) {
    state.__vegaTheIntroDbCache__ = Object.create(null);
  }
  return state.__vegaTheIntroDbCache__;
}

export async function fetchTheIntroDbSkipTimings({
  imdbId,
  tmdbId,
  season,
  episode,
  providerContext,
  signal,
  timeout = 4000,
}: TheIntroDbParams): Promise<SkipInterval[]> {
  if (!imdbId && !tmdbId) return [];
  if (!season || !episode || season < 1 || episode < 1) return [];

  const cache = getIntroDbCache();
  const cacheKey = `${imdbId || tmdbId}:${season}:${episode}`;
  const cached = cache[cacheKey];
  if (cached) {
    if (typeof (cached as any).then === "function") {
      return cached;
    }
    return cached as SkipInterval[];
  }

  const params = new URLSearchParams();
  if (imdbId) params.set("imdb_id", imdbId);
  if (tmdbId) params.set("tmdb_id", tmdbId.toString());
  params.set("season", season.toString());
  params.set("episode", episode.toString());

  const fetchPromise = (async () => {
    try {
      const url = `https://api.theintrodb.org/v2/media?${params.toString()}`;
      const res = await providerContext.axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout,
        signal,
      });

      const data = res.data;
      if (!data || typeof data !== "object") {
        cache[cacheKey] = [];
        return [];
      }

    const skipIntervals: SkipInterval[] = [];

    // 1. Intro
    if (Array.isArray(data.intro)) {
      for (const item of data.intro) {
        const startMs = item?.start_ms ?? 0;
        const endMs = item?.end_ms;
        if (typeof endMs === "number" && endMs > startMs) {
          skipIntervals.push({
            title: "Intro",
            from: Number((startMs / 1000).toFixed(2)),
            to: Number((endMs / 1000).toFixed(2)),
          });
        }
      }
    }

    // 2. Recap
    if (Array.isArray(data.recap)) {
      for (const item of data.recap) {
        const startMs = item?.start_ms ?? 0;
        const endMs = item?.end_ms;
        if (typeof endMs === "number" && endMs > startMs) {
          skipIntervals.push({
            title: "Recap",
            from: Number((startMs / 1000).toFixed(2)),
            to: Number((endMs / 1000).toFixed(2)),
          });
        }
      }
    }

    // 3. Credits
    if (Array.isArray(data.credits)) {
      for (const item of data.credits) {
        const startMs = item?.start_ms;
        const endMs = item?.end_ms;
        if (
          typeof startMs === "number" &&
          typeof endMs === "number" &&
          endMs > startMs
        ) {
          skipIntervals.push({
            title: "Credits",
            from: Number((startMs / 1000).toFixed(2)),
            to: Number((endMs / 1000).toFixed(2)),
          });
        }
      }
    }

    // 4. Preview
    if (Array.isArray(data.preview)) {
      for (const item of data.preview) {
        const startMs = item?.start_ms ?? 0;
        const endMs = item?.end_ms;
        if (typeof endMs === "number" && endMs > startMs) {
          skipIntervals.push({
            title: "Preview",
            from: Number((startMs / 1000).toFixed(2)),
            to: Number((endMs / 1000).toFixed(2)),
          });
        }
      }
    }

    cache[cacheKey] = skipIntervals;
    return skipIntervals;
  } catch {
    delete cache[cacheKey];
    return [];
  }
})();

  cache[cacheKey] = fetchPromise;
  return fetchPromise;
}

export async function enrichEpisodesWithSkipTimings<T extends EpisodeLink>(
  episodes: T[],
  imdbId: string | undefined,
  season: number | undefined,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<T[]> {
  if (!imdbId || !season || season < 1 || !/^tt\d+$/.test(imdbId)) {
    return episodes;
  }

  const promises = episodes.map(async (ep) => {
    const episodeNum = getEpisodeNumber(ep.title, season);
    if (!episodeNum || episodeNum < 1) {
      return ep;
    }

    const skipTimings = await fetchTheIntroDbSkipTimings({
      imdbId,
      season,
      episode: episodeNum,
      providerContext,
      signal,
    });

    if (skipTimings && skipTimings.length > 0) {
      return {
        ...ep,
        skip: skipTimings,
      };
    }
    return ep;
  });

  return Promise.all(promises);
}
