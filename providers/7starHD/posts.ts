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
    const baseUrl = "https://7starhd.sarl";
    let url: string;

    // --- Build URL for category filter or search query
    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
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

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- Parse each movie thumb block ---
    $(".home-wrapper .thumb").each((_, el) => {
      const card = $(el);

      const link = card.find("a[href]").first().attr("href")?.trim();
      if (!link || seen.has(link)) return;

      const title =
        card.find(".thumbtitle").text().trim() ||
        card.find("img").attr("alt")?.trim() ||
        card.find("a[title]").attr("title")?.trim() ||
        "Untitled";

      const image =
        card.find("img").attr("src")?.trim() ||
        card.find("img").attr("data-src")?.trim() ||
        "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("7StarHD fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
