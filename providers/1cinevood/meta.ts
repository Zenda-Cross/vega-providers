import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
        force: true,
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext;
  const baseUrl = await getBaseUrl("1cinevood");
  const url = new URL(link, `${baseUrl}/`).href;

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    const response = await getWithWAF(url, axios, openWebView, commonHeaders);

    const $ = cheerio.load(response.data);
    const infoContainer = $(".entry-content, .post-inner").first();

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Title ---
    // Prioritize title from the main download heading
    const downloadTitleMatch = infoContainer
      .find("h6 span")
      .first()
      .text()
      .match(/(.*)\s*\(\d{4}\)/);
    if (downloadTitleMatch) {
      result.title = downloadTitleMatch[1].trim();
    }

    // Fallback to movie title selector if main heading failed
    if (!result.title || result.title === "Unknown Title") {
      const rawTitle = $("#movie_title a").text().trim();
      // Clean up title from IMDb box: "Kantara A Legend: Chapter 1<small></small>" -> "Kantara A Legend: Chapter 1"
      result.title =
        rawTitle.replace(/<small>.*<\/small>/, "").trim() || "Unknown Title";
    }

    // --- Type determination ---
    // Check if the page title (or URL) suggests a series, otherwise default to movie
    const firstDownloadHeadingText = infoContainer.find("h6").first().text();
    // Improved check: look for Season/Episode patterns (S01, E01, Season 1)
    const isSeries =
      firstDownloadHeadingText.includes("S01") ||
      firstDownloadHeadingText.includes("E01") ||
      firstDownloadHeadingText.toLowerCase().includes("season");
    result.type = isSeries ? "series" : "movie";

    // --- IMDb ID ---
    const imdbMatch = $("#movie_title a").attr("href")?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    // Search for an image within the info container
    let image =
      infoContainer.find('img[decoding="async"]').first().attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;
    result.image = image;

    // --- Synopsis ---
    result.synopsis =
      infoContainer
        .find("#summary b:contains('Summary:')")
        .parent()
        .text()
        .replace("Summary:", "")
        .trim() || "";

    // --- LinkList extraction (Updated for flexible title and link structure) ---
    const links: Link[] = [];

    // Select all <h6> tags that contain quality/file size info.
    const qualityBlocks = infoContainer.find("h6").filter((_, el) => {
      return !$(el).text().includes("Watch Online");
    });

    qualityBlocks.each((index, element) => {
      const el = $(element);
      const fullTitle = el.text().trim();

      // Extract Quality (e.g., 1080p, 720p, 480p)
      const qualityMatch = fullTitle.match(/\d{3,4}p\b/)?.[0] || "";
      // Extract File Size (content within the last pair of brackets, e.g., 11.78 GB)
      // Look for any bracketed text at the end of the title
      const fileSizeMatch =
        fullTitle.match(/\[([^\]]+)\](?=[^\[]*$)/)?.[1] || "";

      // Get all immediate sibling elements until the next <h6> or <hr>.
      const nextSiblings = el.nextUntil("h6, hr");

      // Find all <a> elements that are descendants of the siblings OR are the siblings themselves
      nextSiblings
        .find("a")
        .add(nextSiblings.filter("a"))
        .each((i, btn) => {
          const btnEl = $(btn);
          const link = btnEl.attr("href");

          // Extract the season (S01) and Episode (E01) info
          const seMatch = fullTitle.match(/(S\d{2}E\d{2}|S\d{2}|E\d{2})/);
          const seasonEpisode = seMatch ? `${seMatch[0]} | ` : "";

          links.push({
            // Final title for the link entry (e.g., S01 | 1080p | 11.78 GB)
            title: `${seasonEpisode}${qualityMatch}${
              fileSizeMatch ? " | " + fileSizeMatch : ""
            }`
              .trim()
              .replace(/\|$/, "")
              .trim(),
            quality: qualityMatch,
            episodesLink: result.type === "series" ? link : "",
            directLinks:
              result.type === "movie"
                ? [{ link: link || "", title: "Movie", type: "movie" }]
                : undefined,
          });
        });
    });

    result.linkList = links;
    result.webUrl = url;
    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};
