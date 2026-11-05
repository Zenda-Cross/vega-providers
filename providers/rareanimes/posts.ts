import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

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
// Card appearance config
// ------------------------------------------------------
const CARD_ASPECT_RATIO = 16 / 9;
const CARD_BORDER_RADIUS = 8;

// Map WordPress category CSS classes → display tag
const CATEGORY_TAG_MAP: Record<string, string> = {
  "category-hindi-dub": "HINDI DUB",
  "category-tamil": "TAMIL",
  "category-telugu": "TELUGU",
  "category-animes": "ANIME",
  "category-anime": "ANIME",
  "category-movies": "MOVIE",
  "category-movie": "MOVIE",
  "category-crunchyroll": "CRUNCHYROLL",
  "category-amazon-prime-original": "PRIME",
  "category-completed": "COMPLETED",
  "category-ongoing": "ONGOING",
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
  const baseUrl = await getBaseUrl("RareAnimes");
  return fetchPosts({
    filter,
    page,
    query: "",
    baseUrl,
    operation: "posts",
    signal,
    providerContext,
  });
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
  const baseUrl = await getBaseUrl("RareAnimes");
  return fetchPosts({
    filter: "",
    page,
    query: searchQuery,
    baseUrl,
    operation: "search posts",
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
  baseUrl,
  operation,
  signal,
  providerContext,
}: {
  filter?: string;
  query?: string;
  page?: number;
  baseUrl: string;
  operation: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    let url: string;

    // --- Build URL ---
    if (query && query.trim()) {
      const search = encodeURIComponent(query.trim());
      url =
        page > 1
          ? `${baseUrl}/page/${page}/?s=${search}`
          : `${baseUrl}/?s=${search}`;
    } else if (filter) {
      const cleanFilter = filter.replace(/^\/+|\/+$/g, "");
      url = `${baseUrl}/${cleanFilter}${page > 1 ? `/page/${page}` : ""}/`;
    } else {
      url = page > 1 ? `${baseUrl}/page/${page}/` : `${baseUrl}/`;
    }

    console.log("rareAnimes fetchPosts url:", url);

    const { axios, cheerio } = providerContext;

    const res = await axios.get(url, {
      headers: defaultHeaders,
      signal,
    });

    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    const POST_SELECTORS = [
      "article.herald-post",
      ".herald-posts article.herald-post",
      "article.herald-lay-b.herald-post",
      "article.herald-lay-b",
      ".herald-posts article.herald-lay-b",
      "li.post",
      ".swiper-slide li",
      ".latest-movies-series-swiper-slide li",
      "ul.post-lst li",
    ].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const article = $(el);

      // --------------------------------------------------
      // Get link
      // --------------------------------------------------
      let link =
        article.find("h2.entry-title a[href]").first().attr("href") ||
        article.find("a.herald-read-more[href]").first().attr("href") ||
        article.find("a[href]").first().attr("href") ||
        "";

      if (!link) return;

      link = resolveUrl(link);
      if (seen.has(link)) return;

      // --------------------------------------------------
      // Get title
      // --------------------------------------------------
      const rawTitle =
        article.find("h2.entry-title").first().text().trim() ||
        article.find("img").attr("alt")?.trim() ||
        article.find("a.herald-read-more").attr("title")?.trim() ||
        "";

      if (!rawTitle) return;

      const title = rawTitle.replace(/^Image\s+/i, "").trim();

      // --------------------------------------------------
      // Get image
      // --------------------------------------------------
      const img =
        article.find("img").attr("data-src") ||
        article.find("img").attr("data-lazy-src") ||
        article.find("img").attr("src") ||
        "";

      const image = img ? resolveUrl(img) : "";

      // --------------------------------------------------
      // Derive tag from WP category classes
      // --------------------------------------------------
      const classes = article.attr("class") || "";
      let tag: string | undefined;

      for (const cls of Object.keys(CATEGORY_TAG_MAP)) {
        if (classes.includes(cls)) {
          tag = CATEGORY_TAG_MAP[cls];
          break;
        }
      }

      // --------------------------------------------------
      // Derive cornerTag from season markers or "sticky"
      // --------------------------------------------------
      let cornerTag: string | undefined;

      const seasonMatch = title.match(/Season\s*(\d+)/i);
      if (seasonMatch) {
        cornerTag = `S${seasonMatch[1]}`;
      }

      if (!cornerTag && classes.includes("sticky")) {
        cornerTag = "NEW";
      }

      seen.add(link);

      catalog.push({
        title,
        link,
        image,
        aspectRatio: CARD_ASPECT_RATIO,
        borderRadius: CARD_BORDER_RADIUS,
        tag,
        cornerTag,
      });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    throwProviderError("RareAnimes", operation, err);
  }
}