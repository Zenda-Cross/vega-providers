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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
}

// ------------------------------------------------------
// CORE FUNCTION (FIXED URL CONSTRUCTION)
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
    const baseUrl = "https://anihub.in";
    let url: string;

    // --- Build URL (FIXED SEARCH URL) ---
    if (query && query.trim()) {
      // ✅ FIX: Use /search.php?search=... based on HTML form action
      // Assuming search results don't use the standard /page/X structure for pagination
      url = `${baseUrl}/search.php?search=${encodeURIComponent(query)}`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }
    // --- End Build URL ---


    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --------------------------------------------------------------------------
    // ⭐ Selectors combine various post structures on the site
    // --------------------------------------------------------------------------
    const POST_SELECTORS = [
      ".anime-blog",                     // Recently Updated section
      ".banner-block",                  // Homepage slider
      "li.post",                        // General catalog posts
      ".swiper-slide li",
      ".latest-movies-series-swiper-slide li",
      "ul.post-lst li",                 // Search results list (often used on /search.php)
    ].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const postElement = $(el);

      // --- Logic for .anime-blog structure (Recently Updated) ---
      if (postElement.hasClass('anime-blog')) {
        // Link can be inside .action-overlay or the final <a> tag
        let link = postElement.find(".action-overlay a[href]").attr("href") || postElement.find("> a[href]").attr("href") || "";
        if (!link) return;

        link = resolveUrl(link);
        if (seen.has(link)) return;

        // Title is inside the final <p> tag or the img alt
        let title = postElement.find("> a p").text().trim() || postElement.find("img").attr("alt")?.trim() || "";
        if (!title) return;

        // Image is the src attribute of the img tag
        let img = postElement.find("img").attr("src") || "";

        const image = img ? resolveUrl(img) : "";

        seen.add(link);

        catalog.push({
          title,
          link,
          image,
        });
        return;
      }

      // --- Post extraction logic for the .banner-block structure ---
      if (postElement.hasClass('banner-block')) {
        // Title is inside h2.title
        const titleElement = postElement.find(".banner-content h2.title");
        const title = titleElement.text().trim() || postElement.find("img").attr("alt")?.trim() || "";
        if (!title) return;

        // Link is inside a.play-butn
        let link = postElement.find("a.play-butn").attr("href") || "";
        if (!link) return;

        link = resolveUrl(link);
        if (seen.has(link)) return;

        // Image is inside the col-lg-5 div (the image src) or the background URL
        let img = postElement.find("img").attr("src") || "";

        // Fallback to background-image URL if needed
        if (!img) {
          const styleAttr = postElement.attr('style');
          const match = styleAttr ? styleAttr.match(/url\(([^)]+)\)/i) : null;
          if (match && match[1]) {
            img = match[1].replace(/['"]/g, '').trim();
          }
        }

        const image = img ? resolveUrl(img) : "";

        seen.add(link);

        catalog.push({
          title,
          link,
          image,
        });
        return;
      }

      // --- Post extraction logic for non-banner/non-anime-blog elements (li.post, etc.) ---
      if (postElement.is('li.post') || postElement.is('ul.post-lst li')) {
        // get link
        let link = postElement.find("a[href]").first().attr("href") || "";
        if (!link) return;

        link = resolveUrl(link);
        if (seen.has(link)) return;

        // get title 
        let rawTitle =
          postElement.find("h2.entry-title").first().text().trim() ||
          postElement.find("img").attr("alt")?.trim() ||
          "";

        if (!rawTitle) return;

        // Remove the "Image " prefix from the title text
        let title = rawTitle.replace(/^Image\s+/, '').trim();

        // get image URL
        let img =
          postElement.find("img").attr("data-src") ||
          postElement.find("img").attr("src") ||
          "";

        const image = img ? resolveUrl(img) : "";

        seen.add(link);

        catalog.push({
          title,
          link,
          image,
        });
        return;
      }
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("Anihub fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}