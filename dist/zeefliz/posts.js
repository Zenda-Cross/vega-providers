"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// --- Comprehensive Browser Headers ---
const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://zeefliz.homes/",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    // Cookie is vital for Cloudflare/Litespeed bypass
    "Cookie": "_lscache_vary=0b11c755c41028849a464274c24ea351; _ga=GA1.1.1093268690.1774023357; _ga_5768X4NB9X=GS2.1.s1774023357$o1$g1$t1774023892$j39$l0$h0; cf_clearance=T2t77fgZLwSmq2YALkx7Fob64EfRhUrSdNsGHeWnC4o-1774068430-1.2.1.1-udLAdegHGAptU33HTErbZrR84hV.uZyU7h14wF98Jzlvl2nWhOED6BJvhbo93MiO43L1ttSVr80d7REyVFq5DZGo47sLvcahwxjJh4l8bs6aU8DsfREeDvcbnXQ32a2espgJepmOzGcwl6Dr13ZYR7MwXiRNkrND7H3TcrI5Lil0FNN_deLIQPa3_uD5SFTW5WdqAE1WAhcYg3UTEaXJR9PVAQ6gnz7UF_CypoZF8h4",
};
async function getPosts({ filter, page = 1, signal, providerContext, }) {
    return fetchPosts({ filter, page, query: "", signal, providerContext });
}
async function getSearchPosts({ searchQuery, page = 1, signal, providerContext, }) {
    return fetchPosts({
        filter: "",
        page,
        query: searchQuery,
        signal,
        providerContext,
    });
}
async function fetchPosts({ filter, query, page = 1, signal, providerContext, }) {
    try {
        const baseUrl = await providerContext.getBaseUrl("zeefliz");
        let url;
        // URL Construction
        if (query && query.trim()) {
            url = `${baseUrl}/page/${page}/?s=${encodeURIComponent(query.trim())}`;
        }
        else if (filter && filter !== "latest") {
            // Handles categories or specific filters
            const cleanFilter = filter.replace(/^\/|\/$/g, "");
            url = `${baseUrl}/${cleanFilter}/page/${page}/`;
        }
        else {
            // Home page / Latest
            url = page > 1 ? `${baseUrl}/page/${page}/` : `${baseUrl}/`;
        }
        const { axios, cheerio } = providerContext;
        const res = await axios.get(url, { headers: defaultHeaders, signal });
        const $ = cheerio.load(res.data || "");
        const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, baseUrl).href;
        const seen = new Set();
        const catalog = [];
        // Target the specific article tags found in your HTML
        $("article.post").each((_, el) => {
            const card = $(el);
            // Link: Extracted from the title anchor or the thumbnail anchor
            let link = card.find("h3.entry-title a").attr("href") ||
                card.find("a.post-thumbnail").attr("href") || "";
            if (!link)
                return;
            link = resolveUrl(link);
            if (seen.has(link))
                return;
            // Title: From the h3 tag
            let title = card.find("h3.entry-title").text().trim();
            // Cleanup "Download" prefix if present
            title = title.replace(/^Download\s*/i, "").trim();
            if (!title)
                return;
            // Image: Logic to skip the SVG icon and get the actual webp/jpg image
            const imgElement = card.find("img");
            let img = imgElement.attr("data-src") ||
                imgElement.attr("data-lazy-src") ||
                imgElement.attr("src") ||
                "";
            // Ensure we didn't grab a placeholder/icon
            if (img.startsWith("data:image"))
                img = "";
            const image = img ? resolveUrl(img) : "";
            seen.add(link);
            catalog.push({ title, link, image });
        });
        return catalog;
    }
    catch (err) {
        console.error("zeefliz fetchPosts error:", err);
        return [];
    }
}
