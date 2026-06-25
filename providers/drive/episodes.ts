import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(url);
    const html = res.data;
    let $ = cheerio.load(html);

    const episodeLinks: EpisodeLink[] = [];

    // Try old format first (backward compatibility)
    $('a:contains("HubCloud")').map((i, element) => {
      const title = $(element).parent().prev().text();
      const link = $(element).attr("href");
      if (link && (title.includes("Ep") || title.includes("Download"))) {
        episodeLinks.push({
          title: title.includes("Download") ? "Play" : title,
          link,
        });
      }
    });

    // If old format didn't work, try new format
    if (episodeLinks.length === 0) {
      const streamingServices = ["hubcloud", "gdflix", "pixeldrain", "fastdl"];
      let currentTitle = "";

      $("body *").each((i, element) => {
        const tagName = element.tagName.toLowerCase();
        if (["h3", "h4", "h5", "h6", "strong"].includes(tagName)) {
          const text = $(element).text().trim();
          if (
            text &&
            (text.match(/\d{3,4}p/) ||
              text.match(/ep\d+/i) ||
              text.match(/episode/i) ||
              text.match(/season/i))
          ) {
            if (
              !streamingServices.some((s) => text.toLowerCase().includes(s))
            ) {
              currentTitle = text;
            }
          }
        }

        if (tagName === "a") {
          const href = $(element).attr("href");
          if (href && streamingServices.some((s) => href.includes(s))) {
            let serverName = "Play";
            if (href.includes("hubcloud")) serverName = "HubCloud";
            else if (href.includes("gdflix")) serverName = "GDFlix";
            else if (href.includes("pixeldrain")) serverName = "Pixeldrain";
            else if (href.includes("fastdl")) serverName = "FastDL";

            if (!episodeLinks.find((e) => e.link === href)) {
              episodeLinks.push({
                title: currentTitle
                  ? `${currentTitle} - ${serverName}`
                  : serverName,
                link: href,
              });
            }
          }
        }
      });
    }
    if (episodeLinks.length === 0) {
      // https://hubcloud.foo/drive/gvdzmpioeeaf8mp
      // find link contain hubcloud  and have drive in url using regex
      const hubcloudLink = html.match(
        /https:\/\/hubcloud\.[^\/]+\/drive\/[^"'\s]+/i,
      )?.[0];
      if (hubcloudLink) {
        episodeLinks.push({ title: "Play", link: hubcloudLink });
      }
    }

    console.log("episodeLinks:", episodeLinks);
    return episodeLinks.length > 0
      ? episodeLinks
      : [{ title: "Play", link: url }];
  } catch (err) {
    console.error(err);
    return [
      {
        title: "Server 1",
        link: url,
      },
    ];
  }
};
