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
  return fetchPosts({ filter, page, query: "", signal, providerContext, isSearch: false });
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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext, isSearch: true });
}

// --- Core function to fetch posts ---
async function fetchPosts({
  filter,
  query,
  page = 1,
  signal,
  providerContext,
  isSearch = false,
}: {
  filter?: string;
  query?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isSearch?: boolean;
}): Promise<Post[]> {
  try {
    const baseUrl = "https://allmovieshub.games";
    const { axios, cheerio } = providerContext;
    let res;

    if (isSearch && query) {
      // --- POST request for search
      res = await axios.post(
        baseUrl,
        new URLSearchParams({
          do: "search",
          subaction: "search",
          story: query.trim(),
        }),
        { headers: { ...defaultHeaders, "Content-Type": "application/x-www-form-urlencoded" }, signal }
      );
    } else {
      // --- Normal catalog GET request
      let url: string;
      if (filter) {
        url = filter.startsWith("/")
          ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
          : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
      } else {
        url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
      }
      res = await axios.get(url, { headers: defaultHeaders, signal });
    }

    const $ = cheerio.load(res.data || "");
    const resolveUrl = (href: string) => (href?.startsWith("http") ? href : new URL(href, baseUrl).href);

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- Possible post selectors
    const POST_SELECTORS = [".pstr_box", ".post", ".movie-item", "article"].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const card = $(el);
      let link = card.find("a").first().attr("href");
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title =
        card.find("h2").first().text().trim() ||
        card.find("a[title]").first().attr("title")?.trim() ||
        card.text().trim();
      if (!title) return;
      title = title.replace(/^Download\s*[:-]?/i, "").trim();
      title = title.replace(/\s{2,}/g, " ");

      const img =
        card.find("img").first().attr("data-src") ||
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-original") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
