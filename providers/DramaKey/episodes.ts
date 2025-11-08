import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;
  console.log("getEpisodeLinks", url);

  try {
    const res = await axios.get(url, {
      headers: {
        Referer: "https://www.google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const $ = cheerio.load(res.data);
    const episodes: EpisodeLink[] = [];

    const baseUrl = "https://onlykdrama.top";

    // Loop through all episode links
    $("ul.list-group li.list-group-item a").each((_, el) => {
      const anchor = $(el);
      const href = anchor.attr("href");
      const text = anchor.text().trim();

      if (!href || !text) return;

      // Absolute link
      const fullLink = href.startsWith("http")
        ? href
        : new URL(href, baseUrl).href;

      // Extract episode code like S01E01
      const match = text.match(/S(\d{2})E(\d{2})/i);
      const episodeNum = match ? `Season ${match[1]} Episode ${match[2]}` : "";

      // Clean readable title
      const cleanedTitle = text
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\.mkv|\.mp4/gi, "")
        .replace(/\.[A-Z0-9]+-/gi, " ")
        .replace(/\./g, " ")
        .trim();

      episodes.push({
        title: cleanedTitle,
        link: fullLink,
        
      });
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
};
