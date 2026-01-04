import { ProviderContext } from "../types";

interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = ({
  url,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
  return Promise.resolve([
    {
      title: "Play",
      link: url,
    },
  ]);
};
