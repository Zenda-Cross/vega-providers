import { EpisodeLink, Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const url = link;
    const res = await axios.get(url);
    const data = res.data;
    const $ = cheerio.load(data);

    const urlTitle = decodeURIComponent(
      new URL(url).pathname.split("/").filter(Boolean).pop() || "",
    );
    const heading = $("h1")
      .text()
      .trim()
      .replace(/^Index of\s*/i, "");
    const title =
      heading && heading !== "/" ? heading.replace(/\/$/, "") : urlTitle;

    const links: Link[] = [];
    const directLinks: EpisodeLink[] = [];

    // Parse directory structure
    $("table tbody tr").each((i, element) => {
      const $row = $(element);
      const linkElement = $row.find("a[href]").first();
      const itemTitle = linkElement.text().trim();
      const itemLink = linkElement.attr("href");

      if (
        itemTitle &&
        itemLink &&
        itemTitle !== "../" &&
        itemTitle !== "Parent Directory"
      ) {
        const fullLink = new URL(itemLink, url).href;

        // If it's a directory (ends with /)
        if (itemTitle.endsWith("/")) {
          const cleanTitle = itemTitle.replace(/\/$/, "");
          links.push({
            episodesLink: fullLink,
            title: cleanTitle,
          });
        }
        // If it's a video file
        else if (
          itemTitle.includes(".mp4") ||
          itemTitle.includes(".mkv") ||
          itemTitle.includes(".avi") ||
          itemTitle.includes(".mov")
        ) {
          directLinks.push({
            title: itemTitle,
            link: fullLink,
          });
        }
      }
    });

    // If there are direct video files, add them as a direct link group
    if (directLinks.length > 0) {
      links.push({
        title: title + " (Direct Files)",
        directLinks: directLinks,
      });
    }

    // Determine if this is a movie or series based on structure
    const pathname = new URL(url).pathname;
    const type =
      pathname.startsWith("/tvs/") ||
      pathname.startsWith("/kdrama/") ||
      pathname.startsWith("/asiandrama/") ||
      links.some((item) => item.episodesLink)
        ? "series"
        : "movie";

    return {
      title: title,
      synopsis: `Content from 111477.xyz directory`,
      image: `https://placehold.jp/23/000000/ffffff/300x450.png?text=${encodeURIComponent(
        title,
      )}&css=%7B%22background%22%3A%22%20-webkit-gradient(linear%2C%20left%20bottom%2C%20left%20top%2C%20from(%233f3b3b)%2C%20to(%23000000))%22%2C%22text-transform%22%3A%22%20capitalize%22%7D`,
      imdbId: "",
      type: type,
      linkList: links,
    };
  } catch (err) {
    console.error("111477 meta error:", err);
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
