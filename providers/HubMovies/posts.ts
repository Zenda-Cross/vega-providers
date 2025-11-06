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
        const baseUrl = "https://movielinkhub.fun";
        const { axios, cheerio } = providerContext;

        let url = baseUrl;

        // 🧩 Build URL (handles search, category, or home)
        if (query && query.trim()) {
            url = `${baseUrl}/?s=${encodeURIComponent(query.trim())}${
                page > 1 ? `&paged=${page}` : ""
            }`;
        } else if (filter) {
            const path = filter.startsWith("/") ? filter : `/${filter}`;
            url = `${baseUrl}${path.replace(/\/$/, "")}${
                page > 1 ? `/page/${page}` : ""
            }`;
        } else {
            url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
        }

        const res = await axios.get(url, { headers: defaultHeaders, signal });
        const $ = cheerio.load(res.data || "");

        const resolveUrl = (href: string) =>
            href?.startsWith("http") ? href : new URL(href, baseUrl).href;

        const seen = new Set<string>();
        const catalog: Post[] = [];

        // 🎯 Flexible movie/card selectors to match both search & category results
        const POST_SELECTORS = [
            "article.item.movies",
            ".result-item",
            ".item.movies",
            ".post",
            ".movie-item",
            ".search-item",
            ".search-results article",
            ".movie-card",
        ].join(",");

        $(POST_SELECTORS).each((_, el) => {
            const card = $(el);

            // --- 1️⃣ Extract link
            let link =
                card.find(".data a[href]").attr("href") ||
                card.find(".poster a[href]").attr("href") ||
                card.find("a[href]").first().attr("href") ||
                "";
            if (!link) return;
            link = resolveUrl(link);
            if (seen.has(link)) return;

            // --- 2️⃣ Extract title
            let title =
                card.find(".data h3 a").text().trim() ||
                card.find("h2 a").text().trim() ||
                card.find("h3 a").text().trim() ||
                card.find("a[title]").attr("title")?.trim() ||
                card.find("a").first().text().trim() ||
                "";

            // Clean title (remove year, tags, and brackets)
            title = title
                .replace(/\[.*?\]/g, "")
                .replace(/\(.+?\)/g, "")
                .replace(/\s{2,}/g, " ")
                .trim();

            if (!title) return;

            // --- 3️⃣ Extract image
            const img =
                card.find("img").attr("src") ||
                card.find("img").attr("data-src") ||
                card.find("img").attr("data-original") ||
                card.find("img").attr("data-lazy-src") ||
                "";
            const image = img ? resolveUrl(img) : "";

            seen.add(link);
            catalog.push({ title, link, image });
        });

        // --- If no results found, fallback to generic card pattern
        if (catalog.length === 0) {
            $("a[href*='movielinkhub.fun']").each((_, el) => {
                const href = $(el).attr("href");
                const text = $(el).text().trim();
                if (!href || !text) return;
                const fullUrl = resolveUrl(href);
                if (seen.has(fullUrl)) return;
                seen.add(fullUrl);
                catalog.push({ title: text, link: fullUrl, image: "" });
            });
        }

        return catalog.slice(0, 100);
    } catch (err) {
        console.error(
            "MovieLinkHub fetchPosts error:",
            err instanceof Error ? err.message : String(err)
        );
        return [];
    }
}
