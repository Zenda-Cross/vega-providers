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
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(url, { headers: commonHeaders })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const episodes: EpisodeLink[] = [];

      // Updated selector to match new structure
      $(".eplister ul li").each((_, el) => {
        const item = $(el);
        const a = item.find("a").first();
        let link = a.attr("href") || "";
        if (!link) return;

        if (link.startsWith("//")) link = "https:" + link;

        // Extract episode number only
        const epNum = item.find(".epl-num").text().trim();
        const title = epNum ? `Episode ${epNum}` : "Episode";

        episodes.push({
          title,
          link,
        });
      });

      return episodes;
    })
    .catch((err: any) => {
      console.log("animenosub episodes error:", err?.message || err);
      return [];
    });
};
