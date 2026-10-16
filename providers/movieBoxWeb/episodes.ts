import { EpisodeLink, ProviderContext } from "../types";
import { decodeLink, encodeLink } from "./utils";
import { throwProviderError } from "../providerErrors";

export const getEpisodes = async function ({
  url,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const playback = decodeLink(url);
    const episodes: EpisodeLink[] = [];

    for (const season of playback.seasons || []) {
      const seasonNumber = season.se || 1;
      const maxEpFromRes = season.resolutions?.length
        ? Math.max(0, ...season.resolutions.map((r) => r.epNum || 0))
        : 0;
      const availableEpisodes = season.allEp
        ? season.allEp
            .split(",")
            .map(Number)
            .filter((episode) => episode > 0)
        : Array.from(
            {
              length:
                maxEpFromRes > 0
                  ? Math.min(season.maxEp || maxEpFromRes, maxEpFromRes)
                  : season.maxEp || 0,
            },
            (_, index) => index + 1,
          );

      for (const episode of availableEpisodes) {
        const resolution = season.resolutions
          ?.filter((item) => (item.epNum || 0) >= episode)
          .sort(
            (a, b) => (b.resolution || 0) - (a.resolution || 0),
          )[0]?.resolution;

        if (season.resolutions?.length && !resolution) {
          continue;
        }

        episodes.push({
          title: `S${String(seasonNumber).padStart(2, "0")} E${String(episode).padStart(2, "0")}`,
          link: encodeLink({
            ...playback,
            seasons: undefined,
            season: seasonNumber,
            episode,
            resolution,
          }),
        });
      }
    }
    return episodes;
  } catch (error) {
    throwProviderError("MovieBox Web", "episodes", error);
  }
};
