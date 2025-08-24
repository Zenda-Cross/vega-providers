import { ProviderContext } from "../types";

export async function getEpisodes(url: string, providerContext: ProviderContext) {
  try {
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
    });
    const $ = providerContext.cheerio.load(res.data || "");

    const base = "https://hdmovie2.africa";
    const episodes: { title: string; link: string }[] = [];

    // Multiple possible episode selectors
    const selectors = [
      ".episode-list a",
      ".eps a",
      ".episodes a",
      ".episode a",
      ".entry-content a",
    ];

    selectors.forEach((sel) => {
      $(sel).each((i, el) => {
        const $el = $(el);
        let link = $el.attr("href") || "";
        let title = $el.text().trim() || $el.attr("title") || "";

        if (!link || !title) return;

        // Make link absolute
        if (link.startsWith("/")) link = base + link;

        episodes.push({ title, link });
      });
    });

    // Remove duplicates
    const uniqueEpisodes = episodes.filter(
      (v, i, a) => a.findIndex((t) => t.link === v.link) === i
    );

    return uniqueEpisodes;
  } catch (err) {
    console.error("HDMovie2 getEpisodes error:", err);
    return [];
  }
}


