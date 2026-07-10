import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
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
    const baseUrl = "https://ogomovies.mobi";
    let url: string;

    if (query && query.trim()) {
      // ✅ OGOMovies new search URL
      const encodedQuery = encodeURIComponent(query.trim());
      url =
        page > 1
          ? `${baseUrl}/search-query/${encodedQuery}/page/${page}/`
          : `${baseUrl}/search-query/${encodedQuery}/`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // ✅ OGOMovies structure -> .ml-item
    $(".ml-item").each((_, el) => {
      const anchor = $(el).find("a.ml-mask");
      let link = anchor.attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      // Title
      const title =
        anchor.attr("title")?.trim() || anchor.find("h2").text().trim() || "";

      // Image
      let img =
        anchor.find("img").attr("data-original") ||
        anchor.find("img").attr("src") ||
        "";
      const image = img ? resolveUrl(img) : "";

      if (!title || !image) return;

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
