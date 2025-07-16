import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;
  try {
    const episodeLinks: EpisodeLink[] = [];

    const response = await fetch("https://dob-worker.8man.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        method: "GET",
      }),
    });

    const data = await response.json();
    const list = data?.data?.list || [];

    list.forEach((item: any) => {
      const seriesTitle = item?.ep
        ? `S-${item?.se} E-${item?.ep}`
        : item?.title || "";
      const episodesLink = item?.resourceLink || "";
      if (episodesLink) {
        episodeLinks.push({
          title: seriesTitle.trim(),
          link: JSON.stringify({
            url: episodesLink,
            title: seriesTitle.trim(),
          }),
        });
      }
    });

    return episodeLinks;
  } catch (err) {
    console.error(err);
    return [];
  }
};
