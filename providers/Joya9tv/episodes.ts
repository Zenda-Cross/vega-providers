import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

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
      // Target the container that holds the episode links (based on the provided sample)
      const container = $("ul:has(p.font-bold:contains('Episode'))").first();

      const episodes: EpisodeLink[] = [];

      // Find all bold episode link headings (e.g., 'Episode 38 Links 480p')
      container.find("p.font-bold").each((_, element) => {
        const el = $(element);
        let title = el.text().trim(); // e.g., "Episode 38 Links 480p"
        if (!title) return;

        // Use a selector for the direct links that follow this title (in the next siblings)
        // The episode links are in <li> elements directly following the <p class="font-bold">
        let currentElement = el.parent(); // Get the parent <li> of the <p>

        // Loop through the siblings until the next <p class="font-bold"> (the start of the next episode)
        while (
          currentElement.next().length &&
          !currentElement.next().find("p.font-bold").length
        ) {
          currentElement = currentElement.next();
          // Find all anchor tags (links) in the current <li> sibling
          currentElement.find("a[href]").each((_, a) => {
            const anchor = $(a);
            const href = anchor.attr("href")?.trim();

            // Include links for hubcloud, gdflix, filepress, dotlink, etc.
            if (
              href &&
              (href.includes("hubcloud") ||
                href.includes("gdflix") ||
                href.includes("cloud") ||
                href.includes("dotlink") ||
                href.includes("vcloud") ||
                href.includes("filepress") ||
                href.includes("multicloud"))
            ) {
              // Clean up the title to be just "Episode X 480p"
              episodes.push({
                title: title.replace(/ Links$/i, ""),
                link: href,
              });
            }
          });
        }
      });

      return episodes;
    })
    .catch((err) => {
      throwProviderError("Joya9TV", "episodes", err);
    });
};
