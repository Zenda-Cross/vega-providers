import { Info, Link, ProviderContext } from "../types";

// Headers
const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { cheerio } = providerContext;
  const url = link;
  const baseUrl = url.split("/").slice(0, 3).join("/");

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    const response = await fetch(url, {
      headers: { ...headers, Referer: baseUrl },
    });

    const data = await response.text();
    const $ = cheerio.load(data);
    // Use the main container from the new HTML structure
    const infoContainer = $(".content.right").first();

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Type determination (Based on content, the HTML is for a Series) ---
    // Check for 'S' or 'Season' in the main heading
    if (
      /S\d+|Season \d+|TV Series\/Shows/i.test(
        infoContainer.find("h1").text() + $(".sgeneros").text()
      )
    ) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- Title ---
    const rawTitle = $("h1").first().text().trim();

    // Clean up title (remove 'Download', site name, quality/episode tags)
    let finalTitle = rawTitle
      .replace(/ Download.*|\[Episode \d+ Added\]/g, "")
      .trim();

    // Extract base title before S19, (2025), etc.
    finalTitle =
      finalTitle.split(/\(2025\)| S\d+/i)[0].trim() || "Unknown Title";
    result.title = finalTitle;

    // --- IMDb ID ---
    // The new HTML doesn't explicitly show an IMDb ID, so we'll rely on a more generic search.
    const imdbMatch = infoContainer.html()?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      infoContainer.find(".poster img[src]").first().attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;

    // Check for "no-thumbnail" or "placeholder" in the filename
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ---
    // The synopsis is directly in the <div itemprop="description" class="wp-content"> inside #info
    result.synopsis = $("#info .wp-content").text().trim() || "";

    // --- LinkList extraction (Updated for the <table> structure in #download) ---
    const links: Link[] = [];
    const downloadTable = $("#download .links_table table tbody");

    // The entire season/series batch links are in the table
    downloadTable.find("tr").each((index, element) => {
      const row = $(element);
      const quality = row.find("strong.quality").text().trim();

      // Get the size from the fourth <td> in the row
      const size = row.find("td:nth-child(4)").text().trim();

      const directLinkAnchor = row.find("td a").first();
      const directLink = directLinkAnchor.attr("href");
      const linkTitle = directLinkAnchor.text().trim();

      if (quality && directLink) {
        // FIX: Assert the type to satisfy the Link interface's literal type requirement
        const assertedType = result.type as "movie" | "series";

        // Assuming the table links are for the entire batch/season
        const directLinks = [
          {
            title: linkTitle || "Download Link",
            link: directLink,
            type: assertedType, // Use the asserted type
          },
        ];

        // Combine title, quality, and size for the LinkList entry
        const seasonMatch = rawTitle.match(/S(\d+)/)?.[1];
        let fullTitle = `${result.title}`;
        if (seasonMatch) fullTitle += ` Season ${seasonMatch}`;
        fullTitle += ` - ${quality}`;
        if (size) fullTitle += ` (${size})`; // ADDED: Append size to the link title

        links.push({
          title: fullTitle,
          quality: quality.replace(/[^0-9p]/g, ""), // Clean to just 480p, 720p, 1080p
          // The direct link is to a page that lists all episodes, so it acts as the episodesLink
          episodesLink: directLink,
          directLinks,
        });
      }
    });

    result.linkList = links;
    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};
