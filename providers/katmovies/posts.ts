import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

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

function parseSvelteData(html: string): any {
  const match = html.match(/resolve\(\{\s*id:\s*\d+,\s*data:/);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const errorIdx = html.indexOf(",error:", start);
  if (errorIdx === -1) return null;
  const dataStr = html.substring(start, errorIdx);
  try {
    return Function(`"use strict"; return (${dataStr});`)();
  } catch {
    return null;
  }
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { cheerio, axios, openWebView, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl("kat");
  let url: string;
  if (!filter || filter === "/" || filter === "") {
    url = page > 1 ? `${baseUrl}/?page=${page}` : `${baseUrl}/`;
  } else {
    const cleanFilter = filter.startsWith("/") ? filter : `/${filter}`;
    url = page > 1 ? `${baseUrl}${cleanFilter}?page=${page}` : `${baseUrl}${cleanFilter}`;
  }
  return posts({
    url,
    baseUrl,
    signal,
    cheerio,
    axios,
    openWebView,
    commonHeaders,
    operation: "posts",
  });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { cheerio, axios, openWebView, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl("kat");
  const query = encodeURIComponent(searchQuery);
  const url = page > 1 ? `${baseUrl}/?s=${query}&page=${page}` : `${baseUrl}/?s=${query}`;
  return posts({
    url,
    baseUrl,
    signal,
    cheerio,
    axios,
    openWebView,
    commonHeaders,
    operation: "search posts",
  });
};

async function posts({
  url,
  baseUrl,
  signal,
  cheerio,
  axios,
  openWebView,
  commonHeaders,
  operation,
}: {
  url: string;
  baseUrl: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
  axios: ProviderContext["axios"];
  openWebView: ProviderContext["openWebView"];
  commonHeaders: any;
  operation: string;
}): Promise<Post[]> {
  try {
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const data = res.data;
    const catalog: Post[] = [];

    // 1. Check for SvelteKit data
    const parsed = parseSvelteData(data);
    const items = parsed?.data?.items || parsed?.items;
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const rawTitle = (item.post_title || "")
          .replace(/&amp;/g, "&")
          .replace(/&#8211;/g, "-")
          .replace(/&#8217;/g, "'")
          .replace(/^Download\s+/i, "")
          .trim();
        const slug = item.slug || "";
        const link = slug.startsWith("/") ? slug : `/${slug}`;
        const image = item.thumbnail_image || "";
        if (rawTitle && link) {
          catalog.push({
            title: rawTitle,
            link,
            image,
          });
        }
      }
      if (catalog.length > 0) return catalog;
    }

    // 2. Fallback to Cheerio HTML parsing
    const $ = cheerio.load(data);
    $(".recent-posts, .posts-list, article")
      .children()
      .map((i, element) => {
        const title = $(element).find("img").attr("alt") || $(element).find("h2, h3").text().trim();
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src");
        if (title && link && image) {
          const postUrl = new URL(link, `${baseUrl}/`);
          catalog.push({
            title: title.replace(/^Download\s+/i, "").trim(),
            link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    throwProviderError("KatMovies", operation, err);
  }
}
