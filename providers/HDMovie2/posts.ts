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
    const baseUrl = "https://movietp.com";
    let url: string;

    // ✅ Search URL construction: Use 's' parameter for query and 'paged' for pagination.
    if (query && query.trim()) {
      const params = new URLSearchParams();
      params.append("s", query.trim());
      if (page > 1) params.append("paged", page.toString());
      url = `${baseUrl}/?${params.toString()}`;
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
      
    // Helper function to extract the largest URL from a srcset string
    const getLargestSrcFromSrcset = (srcset: string | undefined): string | null => {
        if (!srcset) return null;
        // Split the srcset string into individual URL/width pairs
        const sources = srcset.split(',').map(s => s.trim().split(/\s+/));
        let largestSrc = null;
        let largestWidth = 0;

        // Find the URL associated with the largest width (or the last URL if widths aren't clear)
        for (const [url, widthStr] of sources) {
            const width = parseInt(widthStr) || 0;
            if (width >= largestWidth) { 
                largestWidth = width;
                largestSrc = url;
            } else if (!largestSrc) {
                // If no width is specified, just take the first URL as a fallback
                largestSrc = url;
            }
        }
        return largestSrc;
    };


    const seen = new Set<string>();
    const catalog: Post[] = [];

    // 🚀 FIX: Use an OR selector to target posts on both the homepage/catalog (article.item.movies)
    // and the search results page (.result-item article).
    const postSelector = "article.item.movies, .result-item article";

    $(postSelector).each((_, el) => {
      const card = $(el);

      // --- Link (Check both title link area and poster area) ---
      const titleLinkEl = card.find(".details .title a, .data h3 a"); 
      const posterLinkEl = card.find(".thumbnail a, .poster a");

      let link = titleLinkEl.attr("href") || posterLinkEl.attr("href") || "";
      link = resolveUrl(link);
      
      if (!link || seen.has(link)) return;

      // --- Title ---
      let title = titleLinkEl.text().trim();
      
      // Fallback for title: use img alt attribute if the text is empty
      if (!title) {
          title = card.find("img").attr("alt")?.trim() || "";
      }
      
      if (!title) return;

      // --- Image (Robust Extraction Logic) ---
      const imgEl = card.find("img").first(); // Target the image within the card
      let img = "";
      
      // 1. Try srcset (standard or lazy-loaded)
      const srcset = imgEl.attr("srcset") || imgEl.attr("data-lazy-srcset");
      const largestSrc = getLargestSrcFromSrcset(srcset);
      if (largestSrc) {
          img = largestSrc;
      }
      
      // 2. Fallback to standard/lazy src attributes
      if (!img) {
          img = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || "";
      }

      // 3. Last resort: Check poster parent for data attributes
      if (!img || img.includes("placeholder") || img.includes("no-thumbnail")) {
          img = card.find(".poster").attr("data-img") || img;
      }

      const image = img ? resolveUrl(img) : "";
      
      // Ensure we discard placeholder or no-thumbnail images
      if (!image || image.includes("placeholder") || image.includes("no-thumbnail")) return; 

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
