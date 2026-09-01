import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
  providerValue?: string;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("w4u");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await axios.get(url);
    const data = res.data;
    const $ = cheerio.load(data);

    const pageTitle = $("h1, .entry-title, title").first().text().replace("Download", "").trim();
    const pageBody = $("body").text();

    const isSeries =
      (/season\s*\d+/i.test(pageTitle) ||
        /\[\s*s\d{1,2}\s*\]/i.test(pageTitle) ||
        /(?:web\s*series|tv\s*series|series)/i.test(pageTitle) ||
        /\[\s*s\d{1,2}\s*e\d{1,2}\s*\]/i.test(pageTitle) ||
        /\[\s*e\d{1,2}\s*added\s*\]/i.test(pageTitle)) &&
      !pageTitle.toLowerCase().includes("full movie");
    const type = isSeries ? "series" : "movie";

    const imdbId = $(".imdb_left").find("a").attr("href")?.split("/")[4] || "";
    let title = $(".entry-content")
      .find('strong:contains("Name")')
      .first()
      .children()
      .remove()
      .end()
      .text()
      .replace(":", "")
      .replace(/\[.*?\]|\(.*?\)|\|.*/g, "")
      .trim();

    if (!title) {
      title = pageTitle.replace(/\[.*?\]|\(.*?\)|\|.*/g, "").trim();
    }

    const synopsis =
      $(".entry-content")
        .find('p:contains("Synopsis"),p:contains("Plot"),p:contains("Story")')
        .first()
        .children()
        .remove()
        .end()
        .text()
        .trim() || "";

    const image =
      $(".wp-caption").find("img").attr("data-src") ||
      $(".entry-content").find("img").attr("data-src") ||
      $(".entry-content").find("img").attr("src") ||
      "";

    const links: Link[] = [];
    $(".my-button").map((i, element) => {
      let linkTitle = $(element).parent().parent().prev().text().trim().replace(/[\r\n\t]+/g, " ");
      const episodesLink = $(element).attr("href");
      const quality = linkTitle.match(/\b(480p|720p|1080p|2160p)\b/i)?.[0] || "";
      if (episodesLink && linkTitle) {
        links.push({
          title: linkTitle,
          episodesLink: type === "series" ? episodesLink : "",
          directLinks:
            type === "movie"
              ? [
                  {
                    link: episodesLink,
                    title: linkTitle,
                    type: "movie",
                  },
                ]
              : [],
          quality,
        });
      }
    });

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links,
      webUrl: url,
    };
  } catch (err) {
    throwProviderError("World4u", "metadata", err);
  }
};
