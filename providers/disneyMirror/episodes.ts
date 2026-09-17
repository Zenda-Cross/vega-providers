import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url: link,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const parts = link.split("|");
  const id = parts[0];
  const seNum = parseInt(parts[1] || "1", 10);
  const epCount = parseInt(parts[2] || "8", 10);

  const episodes: EpisodeLink[] = [];
  for (let ep = 1; ep <= epCount; ep++) {
    episodes.push({
      title: `Episode ${ep}`,
      link: `${id}|${seNum}|${ep}`,
    });
  }

  return episodes;
};
