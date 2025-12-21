import { ProviderContext } from "../types";

interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
  const episodes: EpisodeLink[] = [];

  // slug निकालो
  const slug = url.split("/anime/")[1];

  return fetch(`https://dwnld.justanime.to/api/search?q=${slug}`)
    .then((res) => res.json())
    .then((searchJson) => {
      if (!searchJson?.data?.length) return episodes;

      const session = searchJson.data[0].session;

      return fetch(
        `https://dwnld.justanime.to/api/${session}/releases?page=1`
      )
        .then((res) => res.json())
        .then((releasesJson) => {
          const totalEpisodes = releasesJson.paginationInfo.total;

          for (let ep = 1; ep <= totalEpisodes; ep++) {
            episodes.push({
              title: `Episode ${ep}`,
              link: `${url}/episode/${ep}`,
            });
          }

          return episodes;
        });
    })
    .catch(() => episodes);
};
