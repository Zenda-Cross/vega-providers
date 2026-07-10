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
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}

// --- Normal catalog posts ---
export async function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter, page, query: "", signal, providerContext });
}

// --- Search posts ---
export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({
    filter: "",
    page,
    query: searchQuery,
    signal,
    providerContext,
  });
}

// --- Core function ---
async function fetchPosts({
  filter,
  query,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  query?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const baseUrl = await providerContext.getBaseUrl("1cinevood");
    let url: string;

    // --- Build URL for category filter or search query
    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""
        }`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""
        }`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio, commonHeaders, openWebView } = providerContext;
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, url).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- HDMovie2 selectors
    const POST_SELECTORS = [
      ".pstr_box",
      "article",
      ".result-item",
      ".post",
      ".item",
      ".thumbnail",
      ".latest-movies",
      ".movie-item",
    ].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const card = $(el);
      let link = card.find("a[href]").first().attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title =
        card.find("h2").first().text().trim() ||
        card.find("a[title]").first().attr("title")?.trim() ||
        card.text().trim();
      title = title
        .replace(/\[.*?\]/g, "")
        .replace(/\(.+?\)/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!title) return;

      const img =
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-src") ||
        card.find("img").first().attr("data-original") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "HDMovie2 fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
