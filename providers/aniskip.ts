import { EpisodeLink, ProviderContext, SkipInterval } from "./types";
import { getEpisodeNumber } from "./getCinemetaMeta";
import { fetchTheIntroDbSkipTimings } from "./theintrodb";

function getAniSkipCache(): Record<string, any> {
  const state: any =
    typeof providerGlobal !== "undefined" && providerGlobal
      ? providerGlobal
      : globalThis;
  if (!state.__vegaAniSkipCache__ || typeof state.__vegaAniSkipCache__ !== "object") {
    state.__vegaAniSkipCache__ = Object.create(null);
  }
  return state.__vegaAniSkipCache__;
}

export async function resolveMalIdFromKitsu(
  kitsuId: string,
  providerContext: ProviderContext,
  timeout = 5000,
): Promise<string | null> {
  const cleanKitsuId = kitsuId.replace(/^kitsu:/i, "").split(":")[0].trim();
  if (!cleanKitsuId || !/^\d+$/.test(cleanKitsuId)) return null;

  const cache = getAniSkipCache();
  const cacheKey = `kitsu_mal_${cleanKitsuId}`;
  if (cache[cacheKey] !== undefined) {
    return cache[cacheKey];
  }

  try {
    const url = `https://kitsu.io/api/edge/anime/${cleanKitsuId}/mappings`;
    const res = await providerContext.axios.get(url, {
      headers: {
        Accept: "application/vnd.api+json",
      },
      timeout,
    });

    const mappings = Array.isArray(res.data?.data) ? res.data.data : [];
    const malMapping = mappings.find(
      (m: any) => m.attributes?.externalSite === "myanimelist/anime",
    );
    const malId = malMapping?.attributes?.externalId
      ? String(malMapping.attributes.externalId)
      : null;

    cache[cacheKey] = malId;
    return malId;
  } catch {
    cache[cacheKey] = null;
    return null;
  }
}

export async function resolveKitsuIdFromMal(
  malId: string | number,
  providerContext: ProviderContext,
  timeout = 5000,
): Promise<string | null> {
  const cleanMalId = String(malId).trim();
  if (!cleanMalId || !/^\d+$/.test(cleanMalId)) return null;

  const cache = getAniSkipCache();
  const cacheKey = `mal_kitsu_${cleanMalId}`;
  if (cache[cacheKey] !== undefined) {
    return cache[cacheKey];
  }

  try {
    const url = `https://kitsu.io/api/edge/mappings?filter[external_site]=myanimelist/anime&filter[external_id]=${cleanMalId}&include=item`;
    const res = await providerContext.axios.get(url, {
      headers: {
        Accept: "application/vnd.api+json",
      },
      timeout,
    });

    const kitsuItem = res.data?.included?.[0];
    const kitsuId = kitsuItem?.id ? String(kitsuItem.id) : null;
    cache[cacheKey] = kitsuId;
    return kitsuId;
  } catch {
    cache[cacheKey] = null;
    return null;
  }
}

export async function resolveMalIdFromTitle(
  title: string,
  providerContext: ProviderContext,
  timeout = 5000,
): Promise<string | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  const cache = getAniSkipCache();
  const cacheKey = `title_mal_${cleanTitle.toLowerCase()}`;
  if (cache[cacheKey] !== undefined) {
    return cache[cacheKey];
  }

  try {
    const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(
      cleanTitle,
    )}&page[limit]=1&include=mappings`;
    const res = await providerContext.axios.get(url, {
      headers: {
        Accept: "application/vnd.api+json",
      },
      timeout,
    });

    const included = Array.isArray(res.data?.included) ? res.data.included : [];
    const malMapping = included.find(
      (m: any) => m.attributes?.externalSite === "myanimelist/anime",
    );
    const malId = malMapping?.attributes?.externalId
      ? String(malMapping.attributes.externalId)
      : null;

    cache[cacheKey] = malId;
    return malId;
  } catch {
    cache[cacheKey] = null;
    return null;
  }
}

export async function fetchAniSkipTimings(
  malId: string | number,
  episode: number,
  providerContext: ProviderContext,
  signal?: AbortSignal,
  timeout = 4000,
): Promise<SkipInterval[]> {
  const numMalId = String(malId).trim();
  if (!numMalId || !episode || episode < 1) return [];

  const cache = getAniSkipCache();
  const cacheKey = `aniskip_${numMalId}_${episode}`;
  const cached = cache[cacheKey];
  if (cached) {
    if (typeof cached.then === "function") {
      return cached;
    }
    return cached as SkipInterval[];
  }

  const fetchPromise = (async () => {
    try {
      const url = `https://api.aniskip.com/v2/skip-times/${numMalId}/${episode}?types=op&types=ed&types=recap&types=mixed-op&types=mixed-ed&episodeLength=0`;
      const res = await providerContext.axios.get(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        },
        timeout,
        signal,
      });

      const data = res.data;
      if (!data || !data.found || !Array.isArray(data.results)) {
        cache[cacheKey] = [];
        return [];
      }

      const results = data.results;
      const intervals: SkipInterval[] = [];

      const priorityMap: Record<string, number> = {
        recap: 1,
        op: 2,
        "mixed-op": 3,
        ed: 4,
        "mixed-ed": 5,
      };

      const sortedResults = [...results].sort(
        (a, b) => (priorityMap[a.skipType] || 99) - (priorityMap[b.skipType] || 99),
      );

      const seenTypes = new Set<string>();

      for (const item of sortedResults) {
        const interval = item?.interval;
        if (!interval) continue;

        const start = typeof interval.startTime === "number" ? interval.startTime : 0;
        const end = typeof interval.endTime === "number" ? interval.endTime : 0;
        if (end <= start) continue;

        let title = "Intro";
        let category = "op";
        if (item.skipType === "ed" || item.skipType === "mixed-ed") {
          title = "Credits";
          category = "ed";
        } else if (item.skipType === "recap") {
          title = "Recap";
          category = "recap";
        }

        if (seenTypes.has(category)) {
          continue;
        }
        seenTypes.add(category);

        intervals.push({
          title,
          from: Number(start.toFixed(2)),
          to: Number(end.toFixed(2)),
        });
      }

      intervals.sort((a, b) => a.from - b.from);
      cache[cacheKey] = intervals;
      return intervals;
    } catch {
      delete cache[cacheKey];
      return [];
    }
  })();

  cache[cacheKey] = fetchPromise;
  return fetchPromise;
}

export async function fetchAnimeSkipTimings({
  kitsuId,
  title,
  malId,
  episode,
  season,
  providerContext,
  signal,
  timeout,
}: {
  kitsuId?: string;
  title?: string;
  malId?: string;
  episode?: number;
  season?: number;
  providerContext: ProviderContext;
  signal?: AbortSignal;
  timeout?: number;
}): Promise<SkipInterval[]> {
  if (!episode || episode < 1) return [];

  let resolvedMalId = malId;
  if (!resolvedMalId && kitsuId) {
    resolvedMalId = (await resolveMalIdFromKitsu(kitsuId, providerContext)) || undefined;
  }
  // A series title alone usually resolves to the first MAL season.
  if (!resolvedMalId && !kitsuId && title && (!season || season <= 1)) {
    resolvedMalId = (await resolveMalIdFromTitle(title, providerContext)) || undefined;
  }

  if (resolvedMalId) {
    const timings = await fetchAniSkipTimings(
      resolvedMalId,
      episode,
      providerContext,
      signal,
      timeout,
    );
    if (timings.length > 0) {
      return timings;
    }
  }

  return [];
}

export async function enrichAnimeEpisodesWithSkipTimings<T extends EpisodeLink>(
  episodes: T[],
  options: {
    kitsuId?: string;
    malId?: string;
    title?: string;
    imdbId?: string;
    season?: number;
    providerContext: ProviderContext;
    signal?: AbortSignal;
  },
): Promise<T[]> {
  const { kitsuId, title, imdbId, season, providerContext, signal } = options;

  let malId: string | null = options.malId || null;
  if (!malId && kitsuId) {
    malId = await resolveMalIdFromKitsu(kitsuId, providerContext);
  }
  if (!malId && !kitsuId && title && (!season || season <= 1)) {
    malId = await resolveMalIdFromTitle(title, providerContext);
  }

  const promises = episodes.map(async (ep) => {
    let epNum: number | undefined;
    let animeEpNum: number | undefined;
    let epSeason = season;
    let epMalId = malId;
    try {
      const parsed = JSON.parse(ep.link);
      epNum = Number(parsed.episode);
      animeEpNum = Number(parsed.animeEpisode || parsed.kitsuId?.match(/^kitsu:\d+:(\d+)$/)?.[1] || parsed.episode);
      epSeason = Number(parsed.season) || season;
      epMalId = parsed.malId || malId;
    } catch {
      epNum = season ? getEpisodeNumber(ep.title, season) : undefined;
    }

    if (!epNum || epNum < 1) {
      return ep;
    }

    let skipTimings: SkipInterval[] = [];
    if (epMalId) {
      skipTimings = await fetchAniSkipTimings(epMalId, animeEpNum || epNum, providerContext, signal);
    }

    if ((!skipTimings || skipTimings.length === 0) && imdbId && epSeason) {
      skipTimings = await fetchTheIntroDbSkipTimings({
        imdbId,
        season: epSeason,
        episode: epNum,
        providerContext,
        signal,
      });
    }

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
