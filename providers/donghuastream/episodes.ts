import { ProviderContext } from "../types";

export interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;

  // 🎬 MOVIE CASE → single Play button
  if (!url.includes("episode") && !url.includes("ep")) {
    return Promise.resolve([
      {
        title: "Play",
        link: url,
      },
    ]);
  }

  return axios
    .get(url)
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const episodes: EpisodeLink[] = [];

      $("div.episodelist ul li").each((_: any, el: any) => {
        const a = $(el).find("a");
        const epLink = a.attr("href");
        const epTitle =
          a.find("span").text().trim() ||
          a.text().trim();

        if (epLink) {
          episodes.push({
            title: epTitle,
            link: epLink,
          });
        }
      });

      return episodes.reverse(); // Kotlin logic match
    })
    .catch((err: any) => {
      console.error("Donghuastream episodes error:", err?.message || err);
      return [];
    });
};
