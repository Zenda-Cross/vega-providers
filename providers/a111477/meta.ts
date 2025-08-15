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

    // Extract title from the page header or URL
    const pageTitle =
      $("h1").text().trim() || url.split("/").filter(Boolean).pop() || "";
    const title = pageTitle.replace("Index of /", "").replace(/\/$/, "");

    const links: Link[] = [];
    const directLinks: EpisodeLink[] = [];

    // Parse directory structure
    $("table tbody tr").each((i, element) => {
      const $row = $(element);
      const linkElement = $row.find("td:first-child a");
      const itemTitle = linkElement.text().trim();
      const itemLink = linkElement.attr("href");

      if (
        itemTitle &&
        itemLink &&
        itemTitle !== "../" &&
        itemTitle !== "Parent Directory"
      ) {
        const fullLink = itemLink;

        // If it's a directory (ends with /)
        if (itemTitle.endsWith("/")) {
          const cleanTitle = itemTitle.replace(/\/$/, "");
          links.push({
            episodesLink: link + itemLink,
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
    const type = links.some(
      (link) =>
        link.episodesLink?.includes("Season") ||
        link.episodesLink?.includes("S0")
    )
      ? "series"
      : directLinks.length > 1
      ? "series"
      : "movie";

    return {
      title: title,
      synopsis: `Content from 111477.xyz directory`,
      image: `https://placehold.jp/23/000000/ffffff/300x450.png?text=${encodeURIComponent(
        title
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
