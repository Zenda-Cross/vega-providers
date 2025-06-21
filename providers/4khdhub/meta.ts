import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("4khdhub");
    const url = `${baseUrl}${link}`;
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
        const title = $(element).find(".episode-title").text();
        let directLinks: Link["directLinks"] = [];
        $(element)
          .find(".episode-download-item")
          .map((i, element) => {
            const title = $(element)
              .find(".episode-file-info")
              .text()
              .trim()
              .replace("\n", " ");
            const link = $(element)
              .find(".episode-links")
              .find("a:contains('HubDrive')")
              .attr("href");
            console.log("title⭐", title, "link", link);
            if (title && link) {
              directLinks.push({ title, link });
            }
          });
        if (title && directLinks.length > 0) {
          links.push({
            title,
            directLinks: directLinks,
          });
        }
      });
    } else {
      $(".download-item").map((i, element) => {
        const title = $(element)
          .find(".flex-1.text-left.font-semibold")
          .text()
          .trim();
        const link = $(element)
          .find(".grid.grid-cols-2.gap-2")
          .find("a:contains('HubDrive')")
          .attr("href");
        // console.log("title⭐", title, "link", link);
        if (title && link) {
          links.push({ title, directLinks: [{ title, link }] });
        }
      });
    }
    // console.log('multi meta', links);

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links,
    };
  } catch (err) {
    console.error(err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
