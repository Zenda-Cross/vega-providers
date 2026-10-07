import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
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
    const { axios, cheerio } = providerContext;

    // ✅ Use Animeworld's real base URL
    const baseUrl =
      ((await getBaseUrl("animeworld").catch(() => "")) || "https://watchanimeworld.one").replace(/\/+$/, "");

    let url: string;

    // --- Build URL ---
    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      const cleanFilter = filter.replace(/^\/+/, "").replace(/\/+$/, "");
      url = `${baseUrl}/${cleanFilter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    const POST_SELECTORS = [
      ".anime-blog",
      "article",
      "li.post",
      ".swiper-slide li",
      ".latest-movies-series-swiper-slide li",
      "ul.post-lst li",
    ].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const card = $(el);

      // get link
      let link =
        card.find("a.lnk-blk[href]").attr("href") ||
        card.find(".action-overlay a[href]").attr("href") ||
        card.find("a[href]").first().attr("href") ||
        "";
      if (!link) return;

      link = resolveUrl(link);
      if (seen.has(link)) return;

      // get title
      let rawTitle =
        card.find("h2.entry-title").first().text().trim() ||
        card.find(".entry-title").first().text().trim() ||
        card.find("img").attr("alt")?.trim() ||
        card.find("p[style*='medium']").first().text().trim() ||
        card.find("a[href]").last().text().trim() ||
        "";

      if (!rawTitle) return;

      // remove "Image " prefix from title if present
      let title = rawTitle.replace(/^Image\s+/, "").trim();
      if (title.startsWith("Image ")) {
        title = title.substring(6).trim();
      }

      // get image URL
      let img =
        card.find("img").attr("data-src") ||
        card.find("img").attr("src") ||
        "";

      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    // ✅ Limit first page to 20 posts, other pages to 100
    const limit = page === 1 ? 20 : 100;
    return catalog.slice(0, limit);
  } catch (err) {
    console.error(
      "Animesalt fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}