import {
  applyCinemetaMeta,
  CinemetaMeta,
  CinemetaVideo,
  enrichCinemetaEpisodes,
  getCinemetaMeta,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";
import { EpisodeLink, Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

function getRequest(link: string): { imdbId: string; type: string } {
  const imdbId = link.match(/tt\d+/)?.[0] || "";
  const type = /\bseries\b/i.test(link) ? "series" : "movie";
  if (!imdbId) throw new Error(`Missing IMDb ID in metadata link: ${link}`);
  return { imdbId, type };
}

function createPayload(
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

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { imdbId, type } = getRequest(link);
    const meta = await getCinemetaMeta(imdbId, type, providerContext);
    const linkList: Link[] = [];

    if (type === "series") {
      const seasons = new Map<number, EpisodeLink[]>();
      const now = Date.now();
      for (const video of meta.videos || []) {
        const episode = video.episode ?? video.number;
        if (!video.season || video.season <= 0 || !episode) continue;

        // Filter out unreleased future episodes
        const releaseStr = video.released || video.firstAired;
        if (releaseStr) {
          const releaseTime = new Date(releaseStr).getTime();
          if (!isNaN(releaseTime) && releaseTime > now) {
            continue;
          }
        }

        const episodes = seasons.get(video.season) || [];
        episodes.push({
          title: `Episode ${episode}`,
          link: createPayload(imdbId, "series", meta, video),
        });
        seasons.set(video.season, episodes);
      }
      const skipTimings = await providerContext.kvStore?.get<boolean>("autoEmbed_skipTimings");
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
            imdbId,
            season,
            providerContext,
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
            link: createPayload(imdbId, "movie", meta),
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
  } catch (err) {
    throwProviderError("AutoEmbed", "metadata", err);
  }
};
