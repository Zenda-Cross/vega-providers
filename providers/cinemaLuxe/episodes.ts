import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    console.log("getEpisodeLinks", url);
    
    // Add cookies if necessary to bypass security like Cloudflare
    const res = await axios.get(url, { headers: { ...headers, cookie: "..." } });
    const $ = cheerio.load(res.data);

    const episodes: EpisodeLink[] = [];
    
    // Find the section that contains episode links
    $("section[aria-label*='Download links for episodes']")
      .find("h4")
      .each((index, element) => {
        const el = $(element);
        // Extract the title from the h4 tag, e.g., "-:Episode: 1:-"
        const episodeTitle = el.text().trim().replace(/^-:|-:$/g, "").trim();

        // Find all links in the next p tag
        el.next("p").find("a[href]").each((_, linkEl) => {
          let link = $(linkEl).attr("href");
          
          if (episodeTitle && link) {
            // Check if the link is relative and convert it to an absolute URL
            if (!link.startsWith("http")) {
              link = new URL(link, url).href;
            }
            episodes.push({ title: episodeTitle, link });
          }
        });
      });
      
    // A fallback to look for another common pattern if the first one fails
    // This is optional but good practice for robustness
    if (episodes.length === 0) {
        $(".entry-content,.entry-inner").find("h4").each((index, element) => {
            const el = $(element);
            const episodeTitle = el.text().replace(/-/g, "").replace(/:/g, "");
            
            // Find all links in the next p tag
            el.next("p").find("a[href]").each((_, linkEl) => {
              let link = $(linkEl).attr("href");
              if (episodeTitle && link) {
                // Check if the link is relative and convert it to an absolute URL
                if (!link.startsWith("http")) {
                  link = new URL(link, url).href;
                }
                episodes.push({ title: episodeTitle, link });
              }
            });
        });
    }

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
};
