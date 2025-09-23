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

// --- Fetch normal posts ---
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

// --- Fetch search posts ---
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

// --- Core fetch function ---
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
    const baseUrl = "https://filmycab.media";
    let url: string;

    // --- Updated search URL
    if (query && query.trim()) {
      url = `${baseUrl}/site-search.html?to-search=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
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
      href?.startsWith("http") ? href : new URL(href, url).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- Detect search page
    const isSearchPage = $("form.search").length > 0;

    $(".thumb.rsz, article.post").each((_, el) => {
      const card = $(el);
      let link = card.find("a[href]").attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      // --- Title extraction
      let title = "";
      if (isSearchPage) {
        title =
          card.find("img").attr("alt")?.trim() ||
          card.find("figcaption").text().trim() ||
          "";
      }
      if (!title) {
        title =
          card.find("p").first().text().trim() ||
          card.find("h2.entry-title a").text().trim() ||
          card.find("img").attr("alt")?.trim() ||
          "";
      }
      if (!title) return;

      // --- Image extraction
      const img =
        card.find("img").attr("src") ||
        card.find("img").attr("data-src") ||
        card.find("img").attr("data-original") ||
        "";
      const image = img ? resolveUrl(img) : "";

      // --- Optional fields
      const quality = card.find(".quality").text().trim();
      const lang = card.find(".lang").text().trim();

      seen.add(link);
      catalog.push({
        title,
        link,
        image,
        // @ts-ignore -> extra fields
        quality,
        lang,
      });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "Filmycab fetchPosts error:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}
