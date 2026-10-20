import {
  applyCinemetaMeta,
  CinemetaMeta,
  CinemetaVideo,
  enrichCinemetaEpisodes,
  formatEpisodeTitle,
  getCinemetaMeta,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";
import {
  enrichAnimeEpisodesWithSkipTimings,
  resolveKitsuIdFromMal,
} from "../aniskip";
import { EpisodeLink, Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

function createCinemetaPayload(
  imdbId: string,
  type: string,
  meta: CinemetaMeta,
  video?: CinemetaVideo,
): string {
  const videoParts = video?.id?.split(":") || [];
  return JSON.stringify({
    title: meta.name || "",
    imdbId,
    season: video?.season?.toString() || videoParts[1] || "",
    episode:
      (video?.episode ?? video?.number)?.toString() || videoParts[2] || "",
    type,
    tmdbId: meta.moviedb_id?.toString() || "",
    year: meta.year,
  });
}

async function getCinemetaInfo(
  link: string,
  providerContext: ProviderContext,
): Promise<Info> {
  const imdbId = link.match(/tt\d+/)?.[0] || "";
  const type = /\bseries\b/i.test(link) ? "series" : "movie";
  if (!imdbId) throw new Error(`Missing IMDb ID in link: ${link}`);

  const meta = await getCinemetaMeta(imdbId, type, providerContext);
  if (!meta) {
    return {
      title: imdbId,
      synopsis: "",
      image: "",
      imdbId,
      type,
      linkList: [],
    };
  }

  const linkList: Link[] = [];
  if (type === "series") {
    const seasons = new Map<number, EpisodeLink[]>();
    const now = Date.now();
    for (const video of meta.videos || []) {
      const episode = video.episode ?? video.number;
      if (!video.season || video.season <= 0 || !episode) continue;

      const releaseStr = video.released || video.firstAired;
      if (releaseStr) {
        const releaseTime = new Date(releaseStr).getTime();
        if (!isNaN(releaseTime) && releaseTime > now) {
          continue;
        }
      }

      const episodes = seasons.get(video.season) || [];
      episodes.push({
        title: formatEpisodeTitle(episode, video.name),
        link: createCinemetaPayload(imdbId, "series", meta, video),
      });
      seasons.set(video.season, episodes);
    }

    const skipTimings =
      (await providerContext.kvStore?.get<boolean>("animesub_skipTimings")) ??
      (await providerContext.kvStore?.get<boolean>("torrentio_skipTimings"));

    for (const season of [...seasons.keys()].sort((a, b) => a - b)) {
      const seasonEpisodes = seasons.get(season) || [];
      if (seasonEpisodes.length === 0) continue;
      let directLinks = enrichCinemetaEpisodes(
        seasonEpisodes,
        meta.videos || [],
        season,
      );
      if (skipTimings ?? true) {
        directLinks = await enrichEpisodesWithSkipTimings(
          directLinks,
          imdbId, season, providerContext,
        );
      }
      linkList.push({
        title: `Season ${season}`,
        directLinks,
      });
    }
  } else {
    linkList.push({
      title: meta.name || "Movie",
      directLinks: [
        {
          title: "Movie",
          type: "movie",
          link: createCinemetaPayload(imdbId, "movie", meta),
        },
      ],
    });
  }

  return applyCinemetaMeta(
    {
      title: meta.name || "",
      synopsis: meta.description || "",
      image: meta.background || meta.poster || "",
      poster: meta.poster || "",
      imdbId: imdbId || meta.imdb_id || "",
      type,
      linkList,
    },
    meta,
  );
}

async function getKitsuInfo(
  kitsuId: string,
  providerContext: ProviderContext,
  malId?: string,
): Promise<Info> {
  const url = `https://anime-kitsu.strem.fun/meta/anime/${kitsuId}.json`;
  const res = await providerContext.axios.get(url, {
    headers: providerContext.commonHeaders,
    timeout: 10000,
  });
  const meta = res.data?.meta;
  if (!meta) {
    throw new Error(`Failed to load Kitsu meta for ${kitsuId}`);
  }

  const isMovie =
    meta.type === "movie" ||
    meta.animeType === "movie" ||
    (!meta.videos || meta.videos.length <= 1 && meta.runtime && !meta.videos[0]?.episode);

  const linkList: Link[] = [];
  const skipTimings =
    (await providerContext.kvStore?.get<boolean>("animesub_skipTimings")) ??
    (await providerContext.kvStore?.get<boolean>("torrentio_skipTimings"));

  if (isMovie) {
    const video = meta.videos?.[0];
    const imdbId = video?.imdb_id || meta.imdb_id || "";
    linkList.push({
      title: meta.name || "Movie",
      directLinks: [
        {
          title: "Movie",
          type: "movie",
          link: JSON.stringify({
            title: meta.name,
            kitsuId: video?.id || meta.id,
            imdbId,
            type: "movie",
          }),
        },
      ],
    });
  } else {
    const seasons = new Map<number, EpisodeLink[]>();
    const now = Date.now();
    for (const video of meta.videos || []) {
      const animeEpisode = video.episode ?? video.number ?? 1;
      const season = Number(video.imdbSeason) > 0 ? Number(video.imdbSeason) : video.season || 1;
      const episode = Number(video.imdbEpisode) > 0 ? Number(video.imdbEpisode) : animeEpisode;

      const releaseStr = video.released;
      if (releaseStr) {
        const releaseTime = new Date(releaseStr).getTime();
        if (!isNaN(releaseTime) && releaseTime > now) {
          continue;
        }
      }

      const epTitle = video.title
        ? formatEpisodeTitle(episode, video.title)
        : `Episode ${episode}`;
      const imdbId = video.imdb_id || meta.imdb_id || "";

      const episodes = seasons.get(season) || [];
      episodes.push({
        title: epTitle,
        link: JSON.stringify({
          title: meta.name,
          kitsuId: video.id || `${meta.id}:${animeEpisode}`,
          malId,
          animeEpisode: String(animeEpisode),
          imdbId,
          season: String(season),
          episode: String(episode),
          type: "series",
        }),
        description: video.overview,
        image: video.thumbnail,
      });
      seasons.set(season, episodes);
    }

    for (const season of [...seasons.keys()].sort((a, b) => a - b)) {
      let directLinks = seasons.get(season) || [];
      if (directLinks.length === 0) continue;

      const firstWithImdb = directLinks.find((d) => {
        try {
          return Boolean(JSON.parse(d.link).imdbId);
        } catch {
          return false;
        }
      });
      const seasonImdb = firstWithImdb
        ? JSON.parse(firstWithImdb.link).imdbId
        : meta.imdb_id;

      if (skipTimings ?? true) {
        directLinks = await enrichAnimeEpisodesWithSkipTimings(
          directLinks,
          {
            kitsuId,
            malId,
            title: meta.name,
            imdbId: seasonImdb,
            season,
            providerContext,
          },
        );
      }

      linkList.push({
        title: `Season ${season}`,
        directLinks,
      });
    }
  }

  return {
    title: meta.name || "",
    synopsis: meta.description || "",
    image: meta.background || meta.poster || "",
    poster: meta.poster || "",
    logo: meta.logo || undefined,
    imdbId: meta.imdb_id || "",
    type: isMovie ? "movie" : "series",
    tags: meta.genres,
    rating: meta.imdbRating || meta.kitsuRating,
    linkList,
  };
}

async function getMalInfo(
  malId: string,
  title: string | undefined,
  providerContext: ProviderContext,
): Promise<Info> {
  let kitsuId = await resolveKitsuIdFromMal(malId, providerContext);
  if (!kitsuId && title) {
    try {
      const searchRes = await providerContext.axios.get(
        `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}&page[limit]=1`,
        { headers: { Accept: "application/vnd.api+json" }, timeout: 6000 },
      );
      kitsuId = searchRes.data?.data?.[0]?.id || null;
    } catch {}
  }

  if (kitsuId) {
    return await getKitsuInfo(`kitsu:${kitsuId}`, providerContext, malId);
  }

  if (title) {
    try {
      const cinemetaSearch = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(title)}.json`;
      const cRes = await providerContext.axios.get(cinemetaSearch, { timeout: 6000 });
      const imdbId = cRes.data?.metas?.[0]?.imdb_id;
      if (imdbId) {
        return await getCinemetaInfo(imdbId, providerContext);
      }
    } catch {}
  }

  throw new Error(`Failed to resolve metadata for MAL ID ${malId}`);
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    let malId: string | undefined;
    let title: string | undefined;
    try {
      const parsed = JSON.parse(link);
      if (parsed.malId) malId = String(parsed.malId);
      if (parsed.title) title = parsed.title;
    } catch {
      const malMatch = link.match(/mal:(\d+)/) || link.match(/myanimelist\.net\/anime\/(\d+)/);
      if (malMatch) malId = malMatch[1];
    }

    if (malId) {
      return await getMalInfo(malId, title, providerContext);
    }

    const kitsuMatch = link.match(/kitsu:(\d+)/);
    if (kitsuMatch) {
      return await getKitsuInfo(kitsuMatch[0], providerContext);
    }
    return await getCinemetaInfo(link, providerContext);
  } catch (err) {
    throwProviderError("AnimeSub", "metadata", err);
  }
};
