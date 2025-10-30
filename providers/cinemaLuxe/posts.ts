import { Post, ProviderContext } from "../types";

// --- INSTRUCTION: REPLACE THIS VALUE with a freshly captured cf_clearance cookie ---
const CLOUDFLARE_COOKIE =
    "cf_clearance=Ms03GCabu9vMTxlAvsM8UtPbBiHHp6.aXhI4zi_e9ws-1761843594-1.2.1.1-wxdoOLZzJ7UZQ_zxMiTkgMnsMXjiNX4Y8tGsLEEUoogG9X0i6tCI5_jaBtwTfAI5Vs3IArd66vInuTsgZoDj_0RtmPa8J9cKy79xVNWUS7pXaVrk0PhnY32LhEuV53TSA2bZaHVElKGB1N3cUybvSwEJ6X74T.ZQIDKxpSPIeoAp6T73V9nUW8YEtNY5FnMjzGXgzC_uFUf24HNFURmQotBUEGEqUIEnySuwFEjm3Xs";
// Example structure: cf_clearance=Ms03GCabu9vMTxlAvsM8UtPbBiHHp6.aXhI4zi_e9ws-1761843594-1.2.1.1-wxdoOLZzJ7UZQ_zxMiTkgMnsMXjiNX4Y8tGsLEEUoogG9X0i6tCI5_jaBtwTfAI5Vs3IArd66vInuTsgZoDj_0RtmPa8J9cKy79xVNWUS7pXaVrk0PhnY32LhEuV53TSA2bZaHVElKGB1N3cUybvSwEJ6X74T.ZQIDKxpSPIeoAp6T73V9nUW8YEtNY5FnMjzGXgzC_uFUf24HNFURmQotBUEGEqUIEnySuwFEjm3Xs";


// --- Default HTTP headers (Optimized for standard GET request with security token) ---
const defaultHeaders = {
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,ar;q=0.5,pt;q=0.4",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://vegamovies3.icu/",
    "Cookie": CLOUDFLARE_COOKIE, // ⬅️ CRITICAL (Needs to be fresh)
};

// --- Base URL (update if domain changes) ---
const baseUrl = "https://vegamovies3.icu";

// --- Get normal posts (homepage / categories) ---
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
    return fetchPosts({ filter, page, query: "", signal, providerContext, method: "GET" });
}

// --- Search posts (REVERTING TO GET REQUEST) ---
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
    if (!searchQuery || !searchQuery.trim()) return [];

    const cleanedQuery = searchQuery.trim().replace(/\s+/g, "+");
    
    // Standard GET search URL, as per the site's HTML form
    const queryUrl = `${baseUrl}/?s=${cleanedQuery}${page > 1 ? `&page=${page}` : ""}`;

    const posts = await fetchPosts({
        filter: "",
        page,
        query: cleanedQuery,
        signal,
        providerContext,
        customUrl: queryUrl, 
        method: "GET", // Explicitly using GET
    });

    // Fallback to Google if empty (omitted for brevity, keep your previous implementation)
    // ...

    return posts;
}

// --- Core function (Now simpler, handling only GET) ---
async function fetchPosts({
    filter,
    query,
    customUrl,
    page = 1,
    signal,
    providerContext,
    method = "GET", 
}: {
    filter?: string;
    query?: string;
    customUrl?: string;
    page?: number;
    signal?: AbortSignal;
    providerContext: ProviderContext;
    method?: "GET"; 
}): Promise<Post[]> {
    try {
        let url: string;

        if (customUrl) {
            url = customUrl;
        } else if (query && query.trim()) {
            url = `${baseUrl}/?s=${query}${page > 1 ? `&page=${page}` : ""}`;
        } else if (filter) {
            url = filter.startsWith("/")
                ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
                : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
        } else {
            url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
        }

        const { axios, cheerio } = providerContext;
        
        // Using axios.get with the cookie
        const res = await axios.get(url, { headers: defaultHeaders, signal }); 

        const $ = cheerio.load(res.data || "");
        
        const resolveUrl = (href: string) =>
            href?.startsWith("http") ? href : new URL(href, baseUrl).href;

        const seen = new Set<string>();
        const catalog: Post[] = [];

        const POST_SELECTORS = [
            ".pstr_box", "article.post", ".result-item", ".post-item", ".movie-item",
            ".item", ".thumbnail", ".latest-movies", ".blog-item", ".hentry",
        ].join(",");

        $(POST_SELECTORS).each((_, el) => {
             const card = $(el);
             let link = card.find("a[href]").first().attr("href") || ""; 
             if (!link) return;
             link = resolveUrl(link);
             if (seen.has(link)) return;
 
             let title =
                 card.find("h2 a").first().text().trim() ||
                 card.find("h3 a").first().text().trim() ||
                 card.find("h2").first().text().trim() ||
                 card.find("h3").first().text().trim() ||
                 card.find("a[title]").first().attr("title")?.trim() ||
                 card.text().trim();
 
             title = title
                 .replace(/\[.*?\]/g, "")
                 .replace(/\(.*?\)/g, "")
                 .replace(/\bDownload\b/gi, "")
                 .replace(/\bWEB[-\s]?DL\b/gi, "")
                 .replace(/\bBluRay\b/gi, "")
                 .replace(/\bHDRip\b/gi, "")
                 .replace(/\s{2,}/g, " ")
                 .trim();
 
             if (!title) return;
 
             const img =
                 card.find("img").attr("data-src") ||
                 card.find("img").attr("data-original") ||
                 card.find("img").attr("src") ||
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