import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("4khdhub");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await axios.get(url);
    const data = res.data;
    const $ = cheerio.load(data);
    const type = $(".season-content").length > 0 ? "series" : "movie";
    const imdbId = "";
    const title = $(".page-title").text() || "";
    const image = $(".poster-image").find("img").attr("src") || "";
    const synopsis =
      $(".content-section").find("p").first().text().trim() || "";

    // Links
    const links: Link[] = [];

    if (type === "series") {
      $(".season-item").map((i, element) => {
        const title = $(element)
          .find(".episode-title")
          .text()
          .replace(/[\r\n\t]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        let directLinks: Link["directLinks"] = [];
        $(element)
          .find(".episode-download-item")
          .map((i, element) => {
            const epTitle = $(element)
              .find(".episode-file-info")
              .text()
              .replace(/[\r\n\t]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const link = $(element)
              .find(".episode-links")
              .find("a:contains('HubCloud')")
              .attr("href");
            if (epTitle && link) {
              directLinks.push({ title: epTitle, link });
            }
          });
        if (title && directLinks.length > 0) {
          const quality = title.match(/\d+p\b/i)?.[0] || "";
          links.push({
            title,
            quality,
            directLinks: directLinks,
          });
        }
      });
    } else {
      $(".download-item").map((i, element) => {
        const title = $(element)
          .find(".flex-1.text-left.font-semibold")
          .text()
          .replace(/[\r\n\t]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const link = $(element)
          .find(".grid.grid-cols-2.gap-2")
          .find("a:contains('HubCloud')")
          .attr("href");
        if (title && link) {
          const quality = title.match(/\d+p\b/i)?.[0] || "";
          links.push({ title, quality, directLinks: [{ title, link }] });
        }
      });
    }
    // console.log('multi meta', links);

    const quickDownload = await providerContext.kvStore?.get<boolean>("4khdhub_quickDownload");

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      quickDownload: quickDownload ?? true,
      linkList: links,
      webUrl: url,
    };
  } catch (err) {
    throwProviderError("4KHDHub", "metadata", err);
  }
};
