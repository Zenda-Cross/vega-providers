import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, getBaseUrl } = providerContext;
  try {
    const res = await axios.get(url);
    const baseUrl = await getBaseUrl("moviezwap");
    const html = res.data;
    const $ = cheerio.load(html);

    const episodeLinks: EpisodeLink[] = [];

    $('a[href*="download.php?file="], a[href*="dwload.php?file="]').each(
      (i, el) => {
        const downloadPage =
          $(el).attr("href")?.replace("dwload.php", "download.php") || "";
        let text = $(el).text().trim();
        if (text.includes("Download page")) {
          // Remove "Download" from the text
          text = "Play";
        }
        if (downloadPage && text) {
          // Only add links with quality in text
          episodeLinks.push({
            title: text,
            link: baseUrl + downloadPage,
          });
        }
      }
    );

    return episodeLinks;
  } catch (err) {
    console.error(err);
    return [];
  }
};
