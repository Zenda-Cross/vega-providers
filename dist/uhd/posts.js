"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};
const getPosts = ({ filter, page, signal, providerContext, }) => {
    const { getBaseUrl } = providerContext;
    return getBaseUrl("UhdMovies").then((baseUrl) => {
        const url = page === 1
            ? `${baseUrl}/${filter}/`
            : `${baseUrl}/${filter}/page/${page}/`;
        console.log("Fetching URL:", url);
        return posts(baseUrl, url, signal, providerContext);
    });
};
exports.getPosts = getPosts;
const getSearchPosts = ({ searchQuery, page, signal, providerContext, }) => {
    const { getBaseUrl } = providerContext;
    return getBaseUrl("UhdMovies").then((baseUrl) => {
        const url = `${baseUrl}/page/${page}/?s=${encodeURIComponent(searchQuery)}`;
        console.log("Search URL:", url);
        return posts(baseUrl, url, signal, providerContext);
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(baseURL, url, signal, providerContext) {
    const { axios, cheerio } = providerContext;
    return axios
        .get(url, { headers, signal })
        .then((res) => {
        const html = res.data;
        const $ = cheerio.load(html);
        const uhdCatalog = [];
        // सही selector update किया गया है
        $(".gridlove-posts .layout-masonry article").each((index, element) => {
            var _a;
            const anchor = $(element).find("a").first();
            const title = anchor.attr("title") || anchor.text().trim();
            const link = anchor.attr("href");
            // image के लिए multiple attributes check
            let image = $(element).find("img").attr("src") ||
                $(element).find("img").attr("data-src") ||
                ((_a = $(element).find("img").attr("srcset")) === null || _a === void 0 ? void 0 : _a.split(" ")[0]) ||
                "";
            if (title && link && image) {
                uhdCatalog.push({
                    title: title.replace(/Download/i, "").trim(),
                    link,
                    image,
                });
            }
        });
        return uhdCatalog;
    })
        .catch((err) => {
        console.error("❌ UHD error:", err);
        return [];
    });
}
