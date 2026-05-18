"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
/**
 * Shared headers
 */
const headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: "https://new2.moviesdrives.my/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
};
/**
 * Parse HTML listing pages
 */
async function parseHtmlPosts(url, signal, providerContext) {
    const { axios, cheerio } = providerContext;
    try {
        const res = await axios.get(url, {
            headers,
            signal,
        });
        const $ = cheerio.load(res.data || "");
        const catalog = [];
        $(".movies-grid a, #moviesGridMain a").each((_i, el) => {
            const anchor = $(el);
            // title
            let title = anchor.find(".poster-title").text().trim() ||
                anchor.attr("title") ||
                "";
            // quality
            const quality = anchor.find(".poster-quality").text().trim();
            // link
            let link = anchor.attr("href") || "";
            // image
            const imgEl = anchor.find("img");
            const image = imgEl.attr("src") ||
                imgEl.attr("data-src") ||
                imgEl.attr("data-lazy-src") ||
                "";
            if (!title || !link)
                return;
            // absolute url
            if (link.startsWith("/")) {
                link = `https://new2.moviesdrives.my${link}`;
            }
            // clean title
            title = title.replace(/^Download\s*/i, "").trim();
            const displayTitle = quality
                ? `[${quality}] ${title}`
                : title;
            catalog.push({
                title: displayTitle,
                link,
                image,
            });
        });
        return catalog;
    }
    catch (err) {
        console.error("HTML Parser Error:", err === null || err === void 0 ? void 0 : err.message);
        return [];
    }
}
/* =========================
   POSTS / CATEGORY
========================= */
const getPosts = async function ({ filter, page, signal, providerContext, }) {
    try {
        const baseUrl = await providerContext.getBaseUrl("drive");
        const cleanFilter = filter.startsWith("/")
            ? filter
            : `/${filter}`;
        const normalizedFilter = cleanFilter.endsWith("/")
            ? cleanFilter
            : `${cleanFilter}/`;
        const url = `${baseUrl}${normalizedFilter}page/${page}/`;
        return await parseHtmlPosts(url, signal, providerContext);
    }
    catch (error) {
        console.error("getPosts error:", error === null || error === void 0 ? void 0 : error.message);
        return [];
    }
};
exports.getPosts = getPosts;
/* =========================
   SEARCH API
========================= */
const getSearchPosts = async function ({ searchQuery, page, signal, providerContext, }) {
    var _a;
    const { axios } = providerContext;
    try {
        const baseUrl = await providerContext.getBaseUrl("drive");
        /**
         * IMPORTANT:
         * search.html returns HTML page
         * search.php returns JSON API
         */
        const searchUrl = `${baseUrl}/search.php?q=${encodeURIComponent(searchQuery)}&page=${page}`;
        console.log("searchUrl:", searchUrl);
        const response = await axios.get(searchUrl, {
            headers: {
                ...headers,
                Accept: "application/json",
                Referer: `${baseUrl}/search.html?q=${encodeURIComponent(searchQuery)}`,
            },
            signal,
        });
        const json = response.data;
        const posts = [];
        if (!json || !Array.isArray(json.hits)) {
            console.log("Invalid search response");
            return [];
        }
        for (const item of json.hits) {
            const doc = item === null || item === void 0 ? void 0 : item.document;
            if (!doc)
                continue;
            const title = (doc.post_title || "")
                .replace(/^Download\s*/i, "")
                .trim();
            if (!title)
                continue;
            let link = doc.permalink || "";
            // absolute url
            if (link.startsWith("/")) {
                link = `${baseUrl}${link}`;
            }
            posts.push({
                title,
                link,
                image: doc.post_thumbnail || "",
            });
        }
        return posts;
    }
    catch (err) {
        console.error("Search API Error:", ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) || (err === null || err === void 0 ? void 0 : err.message));
        return [];
    }
};
exports.getSearchPosts = getSearchPosts;
