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
  const { axios, cheerio } = providerContext;

  return axios.get(url).then((res: any) => {
    const $ = cheerio.load(res.data);
    const episodes: EpisodeLink[] = [];

    // =====================================================
    // 🔹 TYPE 1: OLD ARTICLE-BASED EPISODES (KEEP)
    // =====================================================
    $("article article").each((index, el) => {
      const card = $(el);
      const page = card.find("a").attr("href");
      if (!page) return;

      episodes.push({
        title: `Episode ${index + 1}`,
        link: page.startsWith("http")
          ? page
          : "https://www.topcartoons.tv" + page,
      });
    });

    // =====================================================
    // 🔹 TYPE 2: SEASON-BASED EPISODES (NEW)
    // =====================================================
    $(".series-items").each((_, seasonEl) => {
      const seasonBlock = $(seasonEl);

      // Extract season number (Season 1, Season 2...)
      const seasonText =
        seasonBlock.find(".series-name h5").text().trim();

      const seasonMatch = seasonText.match(/\d+/);
      const seasonNum = seasonMatch ? seasonMatch[0] : "";

      seasonBlock.find(".series-item").each((_, epEl) => {
        const ep = $(epEl);

        const page = ep.attr("href");
        if (!page) return;

        const epNum =
          ep.find("span").last().text().trim();

        episodes.push({
          title: seasonNum
            ? `Season ${seasonNum} Episode ${epNum}`
            : `Episode ${epNum}`,
          link: page.startsWith("http")
            ? page
            : "https://www.topcartoons.tv" + page,
        });
      });
    });

    return episodes;
  });
};
