import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

// ------------------------------------------------------
// Normal Catalog Posts
// ------------------------------------------------------
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

// ------------------------------------------------------
// Search Posts
// ------------------------------------------------------
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

// ------------------------------------------------------
// CORE FUNCTION
// ------------------------------------------------------
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
    const baseUrl = "https://animeheaven.me";
    let url: string;

    // -------------------------------
    // URL RESOLUTION
    // -------------------------------
    if (query && query.trim()) {
      url = `${baseUrl}/search.php?s=${encodeURIComponent(query)}`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}`
        : `${baseUrl}/${filter}`;
    } else {
      url = baseUrl;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --------------------------------------------------
    // 🔍 SEARCH PAGE PARSING (FIXED)
    // --------------------------------------------------
    if (query && query.trim()) {
      $("div.similarimg").each((_, el) => {
        const box = $(el);

        const linkEl = box.find("a").first();
        const href = linkEl.attr("href") || "";
        if (!href) return;

        const link = resolveUrl(href);
        if (seen.has(link)) return;

        const title = box.find(".similarname a").text().trim();
        if (!title) return;

        const img = box.find("img.coverimg").attr("src") || "";
        const image = img ? resolveUrl(img) : "";

        seen.add(link);
        catalog.push({
          title,
          link,
          image,
        });
      });

      return page === 1 ? catalog.slice(0, 20) : catalog.slice(0, 100);
    }

    // --------------------------------------------------
    // 🏠 NORMAL / FILTER PAGES (UNCHANGED)
    // --------------------------------------------------
    $("div.chart.bc1").each((_, el) => {
      const chart = $(el);

      const linkEl = chart.find(".chartimg a").first();
      const href = linkEl.attr("href") || "";
      if (!href) return;

      const link = resolveUrl(href);
      if (seen.has(link)) return;

      const title = chart.find(".charttitle a").text().trim();
      if (!title) return;

      const img = linkEl.find("img.coverimg").attr("src") || "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({
        title,
        link,
        image,
      });
    });

    return page === 1 ? catalog.slice(0, 20) : catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "AnimeHeaven fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
