import { Post, ProviderContext } from "../types";

// Using a comprehensive set of desktop headers to bypass potential bot-detection/filtering
const defaultHeaders = {
    Referer: "https://www.google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    DNT: "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
};

// --- Normal catalog posts (uses the general fetch) ---
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

// --- Search posts (uses the general fetch with a query) ---
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

// Helper function for artificial delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        const baseUrl = "https://desiremovies.party";
        const trimmedQuery = query?.trim();
        const isSearch = !!trimmedQuery;
        let url: string;

        // --- Build URL for search query or category filter
        if (isSearch) {
            // FIXED SEARCH URL CONSTRUCTION: Using path-based pagination for robustness
            // URL structure: /page/X/?s=query
            const pathPrefix = page > 1 ? `/page/${page}` : "";
            url = `${baseUrl}${pathPrefix}/?s=${encodeURIComponent(trimmedQuery)}`;
        } else {
            // CATEGORY/HOMEPAGE URL: /filter/page/X or /page/X
            let path = filter || "";
            path = path.replace(/^\/+/, '').replace(/\/+$/, ''); // Normalize path
            
            url = `${baseUrl}/${path}`;
            
            if (page > 1) {
                url = `${url}/page/${page}`;
            }
        }

        const { axios, cheerio } = providerContext;
        let res;
        const maxRetries = 3;

        // --- Use Retry Logic (Simulates Proxy Robustness/Reliability) ---
        // Retry logic is implemented to overcome transient network errors, acting as a 'robust' connection.
        for (let i = 0; i < maxRetries; i++) {
            try {
                // Setting a generous timeout to ensure we don't prematurely cancel the request.
                res = await axios.get(url, { 
                    headers: defaultHeaders, 
                    signal,
                    timeout: 15000, // 15 second timeout for search robustness
                });
                // If successful, break the loop
                break; 
            } catch (error) {
                if (!isSearch || i === maxRetries - 1) {
                    // Re-throw if not a search request or if max retries reached
                    throw error; 
                }
                // Log and wait before retrying (exponential backoff: 1s, 2s)
                console.warn(`Search request failed, retry ${i + 1}/${maxRetries}. Waiting...`);
                await sleep(1000 * (i + 1));
            }
        }

        if (!res) {
            // Should only happen if all retries failed and the last error was caught above
            throw new Error(`Failed to retrieve data after ${maxRetries} attempts.`);
        }

        const $ = cheerio.load(res.data || "");

        const resolveUrl = (href: string) =>
            href?.startsWith("http") ? href : new URL(href, url).href;

        const seen = new Set<string>();
        const catalog: Post[] = [];

        // --- FINAL, ULTRA-GENERIC POST SELECTORS ---
        // Targeting the most common wrapper elements in the WordPress loop
        const POST_SELECTORS = [
            "article",              // HTML5 article tag
            ".post",                // Most common WP post class
            ".type-post",           // Common WP class for post types
            ".item",                // Generic item container
            ".mh-loop-item",        // Specific class used previously
        ].join(",");

        $(POST_SELECTORS).each((_, el) => {
            const card = $(el);
            
            let link = "";
            let title = "";
            let image = "";

            // 1. **PRIMARY LINK/TITLE EXTRACTION:** Find the first meaningful link that is not just an image/logo link.
            const primaryAnchor = card.find("h2 a, h3 a, a[rel='bookmark'], .entry-title a").first();
            
            if (primaryAnchor.length) {
                link = primaryAnchor.attr("href") || "";
                title = primaryAnchor.text().trim();
            }

            // 2. **Fallback Link:** Try the link wrapping the image figure.
            if (!link) {
                const imgAnchor = card.find("figure a[href], .thumb a[href]").first();
                link = imgAnchor.attr("href") || "";
            }

            // 3. **Fallback Title:** Use the anchor's title attribute or image's alt text if the text content is empty.
            if (!title) {
                title = card.find("a[title]").first().attr("title")?.trim() || 
                                card.find("img").first().attr("alt")?.trim() ||
                                "";
            }
            
            // 4. **IMAGE EXTRACTION:** Look for the image using multiple possible attributes.
            const imgEl = card.find("img").first();
            const img = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-original") || "";
            image = img ? resolveUrl(img) : "";


            // --- Final Validation and Cleaning ---
            if (!link) return;
            link = resolveUrl(link);
            if (seen.has(link)) return;

            // Clean up title (remove common tags like quality, brackets, year, etc.)
            title = title.replace(/\[.*?\]/g, "").replace(/\(.+?\)/g, "").replace(/\{.*?\}/g, "").replace(/\s{2,}/g, " ").trim();
            if (!title) return; // Discard post if title is empty after cleaning

            seen.add(link);
            catalog.push({ title, link, image });
        });

        return catalog.slice(0, 100);
    } catch (err) {
        console.error(
            "desiremovies.party fetchPosts error:",
            err instanceof Error ? err.message : String(err)
        );
        return [];
    }
}
