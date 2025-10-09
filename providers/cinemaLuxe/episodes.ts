import { EpisodeLink, ProviderContext } from "../types";

export async function getEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const res = await providerContext.axios.get(url);
    const $ = providerContext.cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    // Select all episode headings (e.g., <h4>-:Episode: 1:-</h4> or <h4>-:Episodes: 1:-</h4>)
    $("h4").each((_, h4El) => {
      const headingText = $(h4El).text().trim();
      
      // Regex to extract the episode number (e.g., '1', '2', '03')
      const match = headingText.match(/-:Episode(s)?:\s*(\d+):-/i);

      if (match && match[2]) {
        const episodeNumber = match[2].padStart(2, '0'); // Pads with zero (e.g., '01', '02')
        const episodeTitle = `Episode ${episodeNumber}`; // Final title format

        // Get the next immediate paragraph element after the current <h4>, which holds the links
        const $linkContainer = $(h4El).next("p");

        // Find the V-Cloud link: must contain "V-Cloud [Resumable]" text and the "vcloud.zip" domain
        const vCloudLinkEl = $linkContainer.find('a:contains("V-Cloud [Resumable]")');
        
        if (vCloudLinkEl.length > 0) {
          const href = vCloudLinkEl.attr("href")?.trim();
          
          if (href && href.includes("vcloud.zip")) {
            episodes.push({
              title: episodeTitle,
              link: href,
            });
          }
        }
      }
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
}

// --- System wrapper
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}