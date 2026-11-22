import { throwProviderError } from "../providerErrors";
import { EpisodeLink, ProviderContext } from "../types";
import {
  buildAnimeUrl,
  callServerFn,
  mapEpisodesToLinks,
  parseAnimeId,
  resolveBaseUrl,
  SERVER_FNS,
} from "./client";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const baseUrl = await resolveBaseUrl();
    const animeId = parseAnimeId(url);
    const episodes = await callServerFn<any[]>(
      SERVER_FNS.EPISODES,
      { id: animeId },
      {
        providerContext,
        baseUrl,
        referer: buildAnimeUrl(baseUrl, animeId),
      },
    );

    return mapEpisodesToLinks(episodes || [], {
      baseUrl,
      animeId,
    });
  } catch (err) {
    throwProviderError("AniDream", "episodes", err);
  }
};
