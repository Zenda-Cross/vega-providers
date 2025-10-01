import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);

  return axios
    .get(url, { headers })
    .then((res) => {
      const $ = cheerio.load(res.data);
      const container = $(".entry-content, .entry-inner");

      // Remove unnecessary elements
      $(".unili-content, .code-block-1").remove();

      const episodes: EpisodeLink[] = [];

      container.find("h4, h3").each((_, element) => {
        const el = $(element);
        let title = el.text().replace(/[-:]/g, "").trim();
        if (!title) return;

        // Saare V-Cloud links fetch
        el.next("p")
          .find("a[href*='vcloud.lol']")
          .each((_, a) => {
            const anchor = $(a);
            const href = anchor.attr("href")?.trim();
            if (href) {
              episodes.push({ title, link: href });
            }
          });
      });

      return episodes;
    })
    .catch((err) => {
      console.log("getEpisodeLinks error:", err);
      return [];
    });
};
