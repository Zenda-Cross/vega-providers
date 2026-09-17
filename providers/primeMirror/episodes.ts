import { EpisodeLink, ProviderContext } from "../types";
import { netMirrorGetEpisodes } from "../netMirrorCommon";

export const getEpisodes = async function ({
  url: link,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return netMirrorGetEpisodes({
    seasonId: link,
    prefix: "pv",
    providerContext,
  });
};
