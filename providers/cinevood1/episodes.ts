import { EpisodeLink, ProviderContext } from "../types";

/**
 * Fetches episode links from a given URL, filters them for specific providers (SkyDrop/Flexplayer),
 * and returns them sorted by episode number.
 *
 * @param {object} params - The parameters object.
 * @param {string} params.url - The URL of the page containing the episode links.
 * @param {ProviderContext} params.providerContext - Context containing axios and cheerio for HTTP and HTML parsing.
 * @returns {Promise<EpisodeLink[]>} A promise that resolves to an array of sorted episode links.
 */
export async function getEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    // 1. Fetch the HTML content of the page
    const res = await providerContext.axios.get(url);
    // 2. Load the content into Cheerio for parsing
    const $ = providerContext.cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    // 3. Iterate over all episode title headings
    $("h4.fittexted_for_content_h4").each((_, h4El) => {
      // Extract the main episode title (e.g., "Episode 11")
      const epTitle = $(h4El).text().trim();
      if (!epTitle) return;

      // 4. Find all links (<a> tags) under the current <h4> until the next <h4> or an <hr>
      $(h4El)
        .nextUntil("h4, hr")
        .find("a[href]") // only select <a> tags that have an 'href' attribute
        .each((_, linkEl) => {
          let href = ($(linkEl).attr("href") || "").trim();
          if (!href) return;

          // Resolve relative URLs to absolute URLs
          if (!href.startsWith("http")) href = new URL(href, url).href;

          const btnText = $(linkEl).text().trim() || "Watch Episode";

          // 5. --- Filter: Only include SkyDrop or Flexplayer links
          const lowerHref = href.toLowerCase();
          if (lowerHref.includes("skydro") || lowerHref.includes("flexplayer.buzz")) {
            episodes.push({
              title: `${epTitle} - ${btnText}`,
              link: href,
            });
          }
        });
    });

    // 6. --- Sort: Sort the collected episodes by episode number extracted from the title
    episodes.sort((a, b) => {
      // Use regex to find the first number in the title string
      const numA = parseInt(a.title.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.title.match(/\d+/)?.[0] || "0");
      return numA - numB; // Ascending sort
    });

    return episodes;
  } catch (err) {
    // Log any errors that occur during fetching or parsing
    console.error("getEpisodeLinks error:", err);
    return []; // Return an empty array on failure
  }
}

// --- System wrapper: Export the main function with the expected name
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  // Simply call the core logic function
  return await getEpisodeLinks({ url, providerContext });
}