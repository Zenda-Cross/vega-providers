import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
    });
    const $ = providerContext.cheerio.load(res.data || "");
    const episodeLinks: EpisodeLink[] = [];

    // Common selectors for episode/download links
    $("a, .download-links a, .episodes a, .links a, .entry-content a").each((i: number, el: any) => {
      const $el = $(el);
      let title = $el.text().trim() || $el.attr("title") || "";
      const link = $el.attr("href") || "";
      if (!link) return;
      // skip archives / zips / batch links
      if (title.toLowerCase().includes("zip") || title.toLowerCase().includes("batch")) return;
      title = title.replace(/\s+Download\s*/i, "").replace(/\(\d{4}\)/, "").trim();
      episodeLinks.push({ title, link });
    });

    // If none found, try to parse buttons
    if (!episodeLinks.length) {
      $(".btn, .dl-btn, .download a").each((i: number, el: any) => {
        const $el = $(el);
        const title = $el.text().trim();
        const link = $el.attr("href") || "";
        if (link && !title.toLowerCase().includes("zip")) episodeLinks.push({ title, link });
      });
    }

    return episodeLinks;
  } catch (err) {
    console.error("cinemaluxe getEpisodes error", err);
    return [];
  }
};
