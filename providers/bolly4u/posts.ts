import { Post, ProviderContext } from "../types";

// Headers to mimic a browser request, making it less likely to be blocked.
const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

/**
 * Fetches movie posts based on a pre-defined filter (e.g., Bollywood, Hollywood).
 * It delegates the request to fetchPosts, passing an empty query.
 * @param {object} params - The parameters for the function.
 * @param {string} params.filter - The category filter to apply.
 * @param {number} params.page - The page number to fetch.
 * @param {AbortSignal} params.signal - An AbortSignal to cancel the request.
 * @param {ProviderContext} params.providerContext - Context providing necessary tools like axios and cheerio.
 * @returns {Promise<Post[]>} A promise that resolves to an array of posts.
 */
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
  // Calls the core fetching function without a search query.
  return fetchPosts({ filter, page, query: "", signal, providerContext });
}

/**
 * **This is the function for the search feature.**
 * It fetches posts based on a specific search query.
 * It also delegates to fetchPosts but passes the searchQuery in the `query` parameter.
 * @param {object} params - The parameters for the function.
 * @param {string} params.searchQuery - The user's search query.
 * @param {number} params.page - The page number for search results.
 * @param {AbortSignal} params.signal - An AbortSignal to cancel the request.
 * @param {ProviderContext} params.providerContext - Context providing necessary tools.
 * @returns {Promise<Post[]>} A promise that resolves to an array of posts.
 */
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
  // Passes the search query to the main fetcher function.
  return fetchPosts({
    filter: "",
    page,
    query: searchQuery,
    signal,
    providerContext,
  });
}

/**
 * The core function to fetch and parse movie posts.
 * It handles both filtered categories and search queries by building the URL based on the `filter` or `query` parameter.
 * @param {object} params - The parameters for the function.
 * @param {string} params.filter - The category filter.
 * @param {string} params.query - The search query.
 * @param {number} params.page - The page number.
 * @param {AbortSignal} params.signal - An AbortSignal to cancel the request.
 * @param {ProviderContext} params.providerContext - Context providing necessary tools.
 * @returns {Promise<Post[]>} A promise that resolves to an array of posts.
 */
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
    const baseUrl = "https://bolly4u.fo";
    let url: string;

    // A switch statement is used to handle different category filters.
    switch (filter) {
      case "Bollywood":
        url = `${baseUrl}/category/bollywood-movies/${page > 1 ? `page/${page}/` : ""}`;
        break;
      case "Hollywood":
        url = `${baseUrl}/category/hollywood-movies/${page > 1 ? `page/${page}/` : ""}`;
        break;
      case "South Movies":
        url = `${baseUrl}/category/south-hindi-dubbed/${page > 1 ? `page/${page}/` : ""}`;
        break;
      case "Dual Audio":
        url = `${baseUrl}/category/dual-audio-movies/${page > 1 ? `page/${page}/` : ""}`;
        break;
      case "Web Series":
        url = `${baseUrl}/category/web-series/${page > 1 ? `page/${page}/` : ""}`;
        break;
      default:
        // **This part of the code handles the search.**
        // If a query exists, it constructs the search URL with the 's' parameter.
        if (query && query.trim()) {
          url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
        } else {
          // If there is no filter or query, it defaults to the home page.
          url = `${baseUrl}${page > 1 ? `/page/${page}/` : ""}`;
        }
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    // --- helpers
    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, url).href;

    const normalize = (s: string) =>
      (s || "")
        .toLowerCase()
        .replace(/[\s\W_]+/g, " ")
        .trim();

    /**
     * **This helper function ensures that the scraped title matches the search query.**
     * It splits the query into individual words and checks if every word is present in the normalized title.
     * @param {string} title - The scraped title.
     * @param {string} q - The search query.
     * @returns {boolean} True if the title matches the query, otherwise false.
     */
    const matchesQuery = (title: string, q?: string) => {
      if (!q || !q.trim()) return true; // no query => allow all
      const nt = normalize(title);
      const nq = normalize(q);
      // token-wise AND match for tighter search
      const tokens = nq.split(" ").filter(Boolean);
      return tokens.every((tok) => nt.includes(tok));
    };

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- multiple post card selectors (WP themes alag alag)
    // The selectors have been updated to be more general and robust.
    const POST_CARD_SELECTORS = [
      "article",
      ".post",
      ".post-box",
      ".post-item",
      ".entry",
      ".blog-grid .item",
      ".latestPost",
      ".box",
      ".grid-item",
      ".archive-post",
      ".moviebox",
      ".movie-card",
      ".grid-post",
    ].join(",");

    const extractFromCard = (card: cheerio.Cheerio) => {
      const a =
        card.find("h2 a[href]").first().attr("href") ||
        card.find(".entry-title a[href]").first().attr("href") ||
        card.find("a[href]").first().attr("href") ||
        "";

      const link = a ? resolveUrl(a) : "";

      let title =
        card.find("h2").first().text().trim() ||
        card.find(".entry-title").first().text().trim() ||
        card.find("a[title]").first().attr("title")?.trim() ||
        card.text().trim();

      title = title
        .replace(/Bolly4u/gi, "")
        .replace(/WB\s*DL/gi, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.+?\)/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      const img =
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-src") ||
        card.find("img").first().attr("data-lazy-src") ||
        card.find("img").first().attr("data-original") ||
        "";

      const image = img ? resolveUrl(img) : "";

      return { title, link, image };
    };

    // 1) Primary scrape from post cards
    $(POST_CARD_SELECTORS).each((_, el) => {
      const { title, link, image } = extractFromCard($(el));
      if (!title || !link) return;
      // Applies the query filter here to refine results.
      if (!matchesQuery(title, query)) return;

      if (!seen.has(link)) {
        seen.add(link);
        catalog.push({ title, link, image });
      }
    });

    // 2) Fallback: direct anchors on archive/search pages
    if (catalog.length === 0) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        // rough filter: post links usually live on same host or contain category
        if (!/bolly4u/i.test(href) && !/category|\/\d{4}\/\d{2}\//i.test(href)) return;

        const link = resolveUrl(href);
        let title =
          $(el).attr("title")?.trim() ||
          $(el).text().trim() ||
          "";

        title = title
          .replace(/Bolly4u/gi, "")
          .replace(/WB\s*DL/gi, "")
          .replace(/\[.*?\]/g, "")
          .replace(/\(.+?\)/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const img =
          $(el).find("img").attr("src") ||
          $(el).find("img").attr("data-src") ||
          $(el).find("img").attr("data-lazy-src") ||
          "";

        const image = img ? resolveUrl(img) : "";

        if (!title || !matchesQuery(title, query)) return;

        if (!seen.has(link)) {
          seen.add(link);
          catalog.push({ title, link, image });
        }
      });
    }

    return catalog;
  } catch (err) {
    console.error(
      "bolly4u fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}