import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const url = link;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
    });
    const data = res.data;
    const $ = providerContext.cheerio.load(data);
    const type = url.includes("tvshows") ? "series" : "movie";
    const imdbId = "";
    const title = url.split("/")[4].replace(/-/g, " ");
    const image = $(".g-item").find("a").attr("href") || "";
    const synopsis = $(".wp-content").text().trim();
    const tags = $(".sgeneros")
      .children()
      .map((i, element) => $(element).text())
      .get()
      .slice(3);
    const rating = Number($("#repimdb").find("strong").text())
      .toFixed(1)
      .toString();
    const links: Link[] = [];
    $(".custom-links")
      .find(".ep-button-container")
      .map((i, element) => {
        const title = $(element)
          .text()
          .replace("\u2b07Download", "")
          .replace("\u2b07 Download", "")
          .trim();
        const link = $(element).find("a").attr("href");
        if (title && link) {
          links.push({
            title,
            episodesLink: link,
            quality: title?.match(/\d+P\b/)?.[0].replace("P", "p") || "",
          });
        }
      });
    if (links.length === 0) {
      $(
        ".ep-button-container:not(:has(a:contains('Click Here To Visit')))"
      ).map((i, element) => {
        let title = $(element)
          .find("a")
          .text()
          .replace("\u2b07Download", "")
          .replace("\u2b07 Download", "")
          .trim();
        if (title.includes("Download Now")) {
          title = $(element)
            .parent()
            .find("h3")
            .text()
            .trim()
            .replace("\u2b07Download", "")
            .replace("\u2b07 Download", "");
        }
        const link = $(element).find("a").attr("href");
        if (title && link) {
          links.push({
            title,
            episodesLink: link,
            quality: title?.match(/\d+P\b/)?.[0].replace("P", "p") || "",
          });
        }
      });
    }
    return {
      title,
      tags,
      rating,
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
