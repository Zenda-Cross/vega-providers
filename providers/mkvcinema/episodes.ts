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
      const container = $(".entry-content, .entry-inner").length 
        ? $(".entry-content, .entry-inner") 
        : $("body"); // Fallback to body if main container not found

      // Remove unnecessary elements
      $(".unili-content, .code-block-1").remove();

      const episodes: EpisodeLink[] = [];

      // --- 1. New Structure Handling (GDFlix/Direct Link Style) ---
      // Target links that are directly wrapped in a div/p and styled as a button
      container.find("div a[href].myButton2, div a[href].myButton1, p a[href]").each((_, a) => {
        const anchor = $(a);
        const href = anchor.attr("href")?.trim();
        const btnText = anchor.text().trim();
        
        // Basic check to see if it looks like an episode link
        if (href && (/\bepisode\s*\d+/i.test(btnText) || /e\s*\d+/i.test(btnText))) {
            // Extract a clean title (e.g., "Episode 1" from a longer button text)
            const titleMatch = btnText.match(/\bepisode\s*\d+\b/i) || btnText.match(/\bE\s*\d+\b/i);
            const title = titleMatch ? titleMatch[0] : btnText;

            episodes.push({ title, link: href });
        }
      });
      
      // --- 2. Old Structure Handling (Fall-back, e.g., V-Cloud style) ---
      if (episodes.length === 0) {
        container.find("h4, h3").each((_, element) => {
          const el = $(element);
          let title = el.text().replace(/[-:]/g, "").trim();
          if (!title) return;

          // Target all links (like V-Cloud, GDFlix, Mega, etc.) under the heading
          el.nextUntil("h4, h3, hr")
            .find("a[href]")
            .each((_, a) => {
              const anchor = $(a);
              const href = anchor.attr("href")?.trim();
              
              // Use the heading's text as the episode title and the link as the episode URL
              if (href) {
                // To avoid duplicates, check if the title already exists.
                // This is a simplification; in a real scenario, you might want to adjust the 'title' 
                // to include quality information from the heading 'el' if multiple links exist.
                
                // If it's a link to another page (not a direct download), use the heading's title
                episodes.push({ title, link: href });
              }
            });
        });
      }

      return episodes;
    })
    .catch((err) => {
      console.log("getEpisodeLinks error:", err);
      return [];
    });
};