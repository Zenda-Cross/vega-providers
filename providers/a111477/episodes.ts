import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;
  try {
    const res = await axios.get(url);
    const html = res.data;
    const $ = cheerio.load(html);
    const episodeLinks: EpisodeLink[] = [];

    // Parse episode files from directory
    $("table tbody tr").each((i, element) => {
      const $row = $(element);
      const linkElement = $row.find("td:first-child a");
      const fileName = linkElement.text().trim();
      const fileLink = linkElement.attr("href");

      if (
        fileName &&
        fileLink &&
        fileName !== "../" &&
        fileName !== "Parent Directory"
      ) {
        // Check if it's a video file
        if (
          fileName.includes(".mp4") ||
          fileName.includes(".mkv") ||
          fileName.includes(".avi") ||
          fileName.includes(".mov")
        ) {
          const fullLink = fileLink;

          // Try to extract episode information from filename
          let episodeTitle = fileName;
          const episodeMatch = fileName.match(/[Ss](\d+)[Ee](\d+)/);
          const simpleEpisodeMatch = fileName.match(/[Ee](\d+)/);

          if (episodeMatch) {
            episodeTitle = `S${episodeMatch[1]}E${episodeMatch[2]} - ${fileName}`;
          } else if (simpleEpisodeMatch) {
            episodeTitle = `Episode ${simpleEpisodeMatch[1]} - ${fileName}`;
          } else {
            // Try to extract episode number from various patterns
            const numberMatch = fileName.match(/(\d+)/);
            if (numberMatch) {
              episodeTitle = `Episode ${numberMatch[1]} - ${fileName}`;
            }
          }

          episodeLinks.push({
            title: episodeTitle,
            link: fullLink,
          });
        }
      }
    });

    return episodeLinks;
  } catch (err) {
    console.error("111477 episodes error:", err);
    return [];
  }
};
