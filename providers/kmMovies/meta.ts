import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

const kmmHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: Record<string, string>,
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
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookies },
      });
    }
    throw error;
  }
}

function resolvePostUrl(link: string, baseUrl: string): string {
  const currentBaseUrl = new URL(baseUrl);
  const postUrl = new URL(link, `${baseUrl}/`);

  if (postUrl.hostname.includes("kmmovies")) {
    return new URL(`${postUrl.pathname}${postUrl.search}`, currentBaseUrl).href;
  }

  return postUrl.href;
}

function getQuality(title: string): string {
  const match = title.match(/\b(480|720|1080|2160)p\b/i);
  return match ? `${match[1]}p` : "AUTO";
}

function getVersionTitle(anchor: any, $: any): string {
  if ($(anchor).hasClass("webdl")) return "WebDL Version";
  if ($(anchor).hasClass("encoded")) return "Encoded Version";
  return "";
}

function extractImdbId($: any, html: string): string {
  const imdbUrl = $("a[href*='imdb.com/title/tt']").first().attr("href") || "";
  return imdbUrl.match(/tt\d+/i)?.[0] || html.match(/tt\d{7,}/i)?.[0] || "";
}

function extractLinkList($: any, pageUrl: string): Link[] {
  const links: Link[] = [];
  const seen = new Set<string>();

  $(".type-content[data-type]").each((_: number, container: any) => {
    const group = $(container).attr("data-type") || "";
    if (group.startsWith("zip-")) return;

    const isEpisodeGroup = group.startsWith("episodes-");
    const groupTitle = group.startsWith("combined-")
      ? "Combined"
      : "Episode Wise";

    $(container)
      .find("a.dl-btn[href]")
      .each((__: number, anchor: any) => {
        const href = $(anchor).attr("href")?.trim();
        const label = $(anchor).text().replace(/\s+/g, " ").trim();
        if (!href || !label) return;

        const versionTitle = getVersionTitle(anchor, $);
        const title = [versionTitle, groupTitle, label]
          .filter(Boolean)
          .join(" - ");
        const resolvedUrl = new URL(href, pageUrl).href;
        const key = `${versionTitle}:${group}:${resolvedUrl}`;
        if (seen.has(key)) return;
        seen.add(key);

        const link: Link = {
          title,
          quality: getQuality(label),
        };

        if (isEpisodeGroup) {
          link.episodesLink = resolvedUrl;
        } else {
          link.directLinks = [
            {
              title,
              link: resolvedUrl,
              type: "series",
            },
          ];
        }

        links.push(link);
      });
  });

  if (links.length > 0) return links;

  $("a.dl-btn[href]").each((_: number, anchor: any) => {
    const group = $(anchor)
      .closest(".type-content[data-type]")
      .attr("data-type");
    if (group?.startsWith("zip-")) return;

    const href = $(anchor).attr("href")?.trim();
    const label = $(anchor).text().replace(/\s+/g, " ").trim();
    if (!href || !label) return;

    const versionTitle = getVersionTitle(anchor, $);
    const title = versionTitle
      ? `${versionTitle} - ${label}`
      : `Download ${label}`;
    const resolvedUrl = new URL(href, pageUrl).href;
    const key = `${versionTitle}:${resolvedUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({
      title,
      quality: getQuality(label),
      directLinks: [
        {
          title,
          link: resolvedUrl,
          type: "movie",
        },
      ],
    });
  });

  return links;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, openWebView } = providerContext;
    const baseUrl = await getBaseUrl("kmmovies");
    const pageUrl = resolvePostUrl(link, baseUrl);
    const res = await getWithWAF(pageUrl, axios, openWebView, kmmHeaders);
    const html = String(res.data || "");
    const $ = cheerio.load(html);
    const overview = $("#movie-overview");

    const title =
      overview.find(".hero-title").first().text().trim() ||
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim() ||
      "Unknown";
    const backdropStyle = overview.find(".hero-backdrop").first().attr("style");
    const backdropPath = backdropStyle?.match(
      /background-image:\s*url\(["']?([^"')]+)["']?\)/i,
    )?.[1];
    const imagePath =
      backdropPath ||
      overview.find("img.hero-poster").first().attr("src") ||
      overview.find("img.hero-poster").first().attr("data-src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
    const image = imagePath ? new URL(imagePath, pageUrl).href : "";
    const synopsis =
      overview
        .find(".hero-description")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim() ||
      $("meta[property='og:description']").attr("content")?.trim() ||
      $("meta[name='description']").attr("content")?.trim() ||
      "";
    const ratingValue = overview
      .find(".meta-pill.rating-star")
      .first()
      .text()
      .match(/[0-9]+(?:\.[0-9]+)?/)?.[0];
    const rating = ratingValue ? `${ratingValue}/10` : "";
    const imdbId = extractImdbId($, html);
    const tags = [
      ...new Set(
        $("a[href*='/genre/']")
          .map((_, element) => {
            const href = $(element).attr("href") || "";
            const path = new URL(href, pageUrl).pathname;
            return path !== "/genre/"
              ? $(element).text().replace(/\s+/g, " ").trim()
              : "";
          })
          .get()
          .filter(Boolean),
      ),
    ];
    const cast = $("a[href*='/actor/']")
      .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean);
    const linkList = extractLinkList($, pageUrl);
    const type =
      $(".type-content[data-type^='episodes-']").length > 0 ||
      /\bS\d{1,2}\b/i.test(title)
        ? "series"
        : "movie";

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      tags,
      cast,
      rating,
      linkList,
      webUrl: pageUrl,
    };
  } catch (err) {
    console.error("KMMOVIES getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "https://via.placeholder.com/300x450",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "",
      linkList: [],
    };
  }
};
