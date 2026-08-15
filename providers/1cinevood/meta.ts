import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  addCinemetaContext,
  applyCinemetaMeta,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";

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
        // force: true,
      });
      return await axios.get(url, {
        headers: {
          ...headers,
          Referer: baseUrl,
          "User-Agent": wafResult.userAgent || headers["User-Agent"],
          Cookie: wafResult.cookies || wafResult.cookie,
        },
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

  try {
    const response = await getWithWAF(url, axios, openWebView, commonHeaders);

    const $ = cheerio.load(response.data);
    const infoContainer = $(".entry-content, .post-inner").first();

    const cleanText = (value?: string): string =>
      value ? $("<div>").html(value).text().replace(/\s+/g, " ").trim() : "";
    const schemaNodes: any[] = [];
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const schema = JSON.parse($(script).html() || "");
        const roots = Array.isArray(schema) ? schema : [schema];
        roots.forEach((root) => {
          schemaNodes.push(root);
          if (Array.isArray(root?.["@graph"])) {
            schemaNodes.push(...root["@graph"]);
          }
        });
      } catch {
        // A malformed unrelated schema block must not prevent page scraping.
      }
    });
    const hasSchemaType = (node: any, type: string): boolean => {
      const types = Array.isArray(node?.["@type"])
        ? node["@type"]
        : [node?.["@type"]];
      return types.some(
        (value: unknown) =>
          typeof value === "string" && value.toLowerCase() === type,
      );
    };
    const mediaSchema =
      schemaNodes.find((node) => hasSchemaType(node, "movie")) ||
      schemaNodes.find((node) => hasSchemaType(node, "tvseries")) ||
      schemaNodes.find((node) => hasSchemaType(node, "tvepisode"));

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // Prefer the site's clean media title, then structured metadata, and only
    // use the release-heavy WordPress page title as the final fallback.
    result.title =
      cleanText($(".cv-movie-title").first().text()) ||
      cleanText(mediaSchema?.name) ||
      cleanText($("#movie_title a").first().text()) ||
      cleanText($("meta[property='og:title']").attr("content")) ||
      cleanText($("h1.entry-title, h1.single-title").first().text()) ||
      cleanText($("title").first().text()) ||
      "Unknown Title";

    // --- Type determination ---
    // Check if the page title (or URL) suggests a series, otherwise default to movie
    const firstDownloadHeadingText = infoContainer.find("h5,h6").first().text();
    // Improved check: look for Season/Episode patterns (S01, E01, Season 1)
    const isSeries =
      /\bS\d{1,2}(?:E\d{1,3})?\b/i.test(firstDownloadHeadingText) ||
      /\bE\d{1,3}\b/i.test(firstDownloadHeadingText) ||
      firstDownloadHeadingText.toLowerCase().includes("season") ||
      hasSchemaType(mediaSchema, "tvseries") ||
      hasSchemaType(mediaSchema, "tvepisode") ||
      /\b(?:series|season)\b/i.test($(".cv-card-download-info").first().text());
    result.type = isSeries ? "series" : "movie";

    // --- IMDb ID ---
    const imdbMatch =
      $("a[href*='imdb.com/title/tt']").first().attr("href")?.match(/tt\d+/) ||
      String(mediaSchema?.sameAs || mediaSchema?.url || "").match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    // Search for an image within the info container
    const schemaImage =
      typeof mediaSchema?.image === "string"
        ? mediaSchema.image
        : mediaSchema?.image?.url || mediaSchema?.image?.contentUrl;
    let image =
      $(".cv-movie-poster-img").first().attr("src") ||
      schemaImage ||
      $("meta[property='og:image']").attr("content") ||
      infoContainer.find('img[decoding="async"]').first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    result.image = image;

    // --- Synopsis ---
    result.synopsis =
      cleanText(
        $(".cv-movie-overview-box")
          .first()
          .clone()
          .children()
          .remove()
          .end()
          .text(),
      ) ||
      cleanText(mediaSchema?.description) ||
      cleanText(
        infoContainer
          .find("#summary b:contains('Summary:')")
          .parent()
          .text()
          .replace("Summary:", ""),
      ) ||
      cleanText($("meta[property='og:description']").attr("content")) ||
      cleanText($("meta[name='description']").attr("content"));

    // --- LinkList extraction (Updated for flexible title and link structure) ---
    const links: Link[] = [];

    // Download sections currently use h5, while older pages used h6.
    const qualityBlocks = infoContainer.find("h5,h6").filter((_, el) => {
      const text = $(el).text();
      return (
        !text.includes("Watch Online") &&
        /\b(?:\d{3,4}p|2160p|4k|S\d{1,2}|E\d{1,3})\b/i.test(text)
      );
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

      // Get all immediate sibling elements until the next download section.
      const nextSiblings = el.nextUntil("h5, h6, hr");

      // Find all <a> elements that are descendants of the siblings OR are the siblings themselves
      nextSiblings
        .find("a")
        .add(nextSiblings.filter("a"))
        .each((i, btn) => {
          const btnEl = $(btn);
          const link = btnEl.attr("href");
          if (
            !link ||
            link === "#" ||
            link.startsWith("javascript:") ||
            !/(?:oxxfile|hubcloud)/i.test(link)
          ) {
            return;
          }

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

    if (result.type === "movie" && links.length === 0) {
      infoContainer
        .find('a[href*="oxxfile"],a[href*="hubcloud"]')
        .each((_, anchor) => {
          const link = $(anchor).attr("href");
          if (!link) return;
          links.push({
            title: $(anchor).text().trim() || "Movie",
            directLinks: [{ link, title: "Movie", type: "movie" }],
          });
        });
    }

    result.linkList = links;
    result.webUrl = url;
    const imdbId = result.imdbId;
    if (!imdbId) return result;

    let cinemeta;
    try {
      cinemeta = await getCinemetaMeta(imdbId, result.type, providerContext);
    } catch (error) {
      console.warn(
        `Cinemeta lookup failed for ${imdbId}; using scraped Cinewood metadata.`,
        error,
      );
      return result;
    }
    if (result.type === "series" && cinemeta.type === "series") {
      result.linkList = result.linkList.map((item) => {
        if (!item.episodesLink) return item;
        const season = getCinemetaSeason(item.title);
        if (!season) return item;
        return {
          ...item,
          episodesLink: addCinemetaContext(
            new URL(item.episodesLink, url).href,
            imdbId,
            season,
          ),
        };
      });
    }
    return applyCinemetaMeta(result, cinemeta);
  } catch (err) {
    throwProviderError("1CineVood", "metadata", err);
  }
};
