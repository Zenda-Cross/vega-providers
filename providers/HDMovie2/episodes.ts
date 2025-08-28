import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio, getBaseUrl, commonHeaders } = providerContext;
    const base = (await getBaseUrl("HDMovie2")) || "https://hdmovie2.careers";
    const res = await axios.get(url, { headers: commonHeaders });
    const $ = cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    // Select the main seasons container
    const seasonsContainer = $("#seasons");

    if (seasonsContainer.length === 0) {
      console.log("HDMovie2 getEpisodes: No seasons container found. Falling back to direct link search.");
      // Fallback if the standard structure is not found
      $("a").each((_, el) => {
        const $el = $(el);
        const link = $el.attr("href") || "";
        const title = $el.text().trim();
        if (link.match(/episode-\d+/i) || title.match(/episode/i)) {
          if (link.startsWith("/")) {
            episodes.push({ title, link: base + link });
          } else if (link.startsWith("http")) {
            episodes.push({ title, link });
          }
        }
      });
      return episodes;
    }

    // Iterate through each season and its episodes
    seasonsContainer.find(".episodios li").each((i, el) => {
      const $el = $(el);
      let link = $el.find("a").attr("href") || "";
      const title = $el.find(".episodiotitle a").text().trim();
      const seasonTitle = $el.closest(".se-q").find(".se-t").text().trim();
      
      if (!link) return;

      if (link.startsWith("/")) {
        link = base + link;
      }

      // Create a more descriptive title
      const fullTitle = seasonTitle ? `${seasonTitle} - ${title}` : title;

      episodes.push({ title: fullTitle, link });
    });

    console.log(`[HDMovie2] Found ${episodes.length} episodes.`);
    return episodes;
    
  } catch (err) {
    console.error("HDMovie2 getEpisodes error:", err);
    return [];
  }
};