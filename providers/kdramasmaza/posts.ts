/* v1.1 rebuild */
import { Post, ProviderContext } from "../types";

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
      const cookie = wafResult?.cookie || wafResult?.cookies || "";
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: cookie },
      });
    }
    throw error;
  }
}

function buildListUrl(baseUrl: string, filter: string, page: number): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanFilter = (filter || "").replace(/\/$/, "");
  if (!cleanFilter) {
    return page > 1 ? `${cleanBase}/page/${page}/` : `${cleanBase}/`;
  }
  return page > 1
    ? `${cleanBase}${cleanFilter}/page/${page}/`
    : `${cleanBase}${cleanFilter}/`;
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
  const { getBaseUrl, cheerio, axios, openWebView, commonHeaders } =
    providerContext;
  const baseUrl = await getBaseUrl("kdramasmaza");
  const url = buildListUrl(baseUrl, filter, page);
  return posts({
    url,
    baseUrl,
    signal,
    cheerio,
    axios,
    openWebView,
    commonHeaders,
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
  const { getBaseUrl, cheerio, axios, openWebView, commonHeaders } =
    providerContext;
  const baseUrl = await getBaseUrl("kdramasmaza");
  const cleanBase = baseUrl.replace(/\/$/, "");
  const url =
    page > 1
      ? `${cleanBase}/page/${page}/?s=${encodeURIComponent(searchQuery)}`
      : `${cleanBase}/?s=${encodeURIComponent(searchQuery)}`;
  return posts({
    url,
    baseUrl,
    signal,
    cheerio,
    axios,
    openWebView,
    commonHeaders,
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
}: {
  url: string;
  baseUrl: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
  axios: ProviderContext["axios"];
  openWebView: ProviderContext["openWebView"];
  commonHeaders: any;
}): Promise<Post[]> {
  try {
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    const seen = new Set<string>();

    $("article.post, article").each((_, element) => {
      const el = $(element);
      const link =
        el.find("h2.entry-title a").attr("href") ||
        el.find(".entry-title a").attr("href") ||
        el.find("a").attr("href");
      const title =
        el.find("h2.entry-title a").text() ||
        el.find(".entry-title a").text() ||
        el.find("img").attr("alt") ||
        el.find("img").attr("title") ||
        "";
      const image =
        el.find("img").attr("src") ||
        el.find("img").attr("data-src") ||
        el.find("img").attr("data-lazy-src") ||
        "";

      if (!title || !link || seen.has(link)) return;
      seen.add(link);
      catalog.push({
        title: title.replace(/Download/gi, "").replace(/\s+/g, " ").trim(),
        link,
        image,
      });
    });

    return catalog;
  } catch (err) {
    console.error("kdramasmaza posts error ", err);
    return [];
  }
}
