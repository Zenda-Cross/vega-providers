import { Post, ProviderContext } from "../types";

// ✅ Default headers to mimic a real browser request
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

// --- Core Universal Fetch Function ---
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
        const baseUrl = "https://dramafull.cc";
        const { axios, cheerio } = providerContext;

        // Build URL
        let url = baseUrl;
        if (query && query.trim()) {
            url = `${baseUrl}/?s=${encodeURIComponent(query.trim())}${page > 1 ? `&paged=${page}` : ""}`;
        } else if (filter) {
            const path = filter.startsWith("/") ? filter : `/${filter}`;
            url = `${baseUrl}${path.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`;
        } else {
            url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
        }

        const res = await axios.get(url, { headers: defaultHeaders, signal });
        const $ = cheerio.load(res.data || "");

        const resolveUrl = (href: string) => (href?.startsWith("http") ? href : new URL(href, baseUrl).href);
        const seen = new Set<string>();
        const posts: Post[] = [];

        // 🎯 Dramafull card selector
        $(".flw-item").each((_, el) => {
            const card = $(el);

            // --- 1️⃣ Link
            let link = card.find("a.film-poster-ahref").attr("href") || "";
            if (!link) return;
            link = resolveUrl(link);
            if (seen.has(link)) return;

            // --- 2️⃣ Title
            let title = card.find("h3.film-name a.dynamic-name").text().trim();
            if (!title) return;

            // --- 3️⃣ Image
            const img = card.find("img").attr("data-src") || card.find("img").attr("src") || "";
            const image = img ? resolveUrl(img) : "";

            // --- 4️⃣ Type (Movie / TV-Show)
            const type = card.find(".fd-infor .fdi-item").first().text().trim();

            // --- 5️⃣ Duration / Episodes
            const duration = card.find(".fd-infor .fdi-duration").text().trim();

            // --- 6️⃣ Date (optional)
            const date = card.find(".created-date .date-diff").attr("data-src") || "";

            seen.add(link);
            posts.push({
                title,
                link,
                image,
                
            });
        });

        return posts.slice(0, 100);
    } catch (err) {
        console.error(
            "Dramafull fetchPosts error:",
            err instanceof Error ? err.message : String(err)
        );
        return [];
    }
}
