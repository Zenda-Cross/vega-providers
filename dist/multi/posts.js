"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("multi");
    const url = `${baseUrl + filter}page/${page}/`;
    return posts({ url, signal, cheerio });
};
exports.getPosts = getPosts;
const getSearchPosts = async function ({ searchQuery, signal, providerContext, }) {
    const { getBaseUrl, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("multi");
    const url = `${baseUrl}/?s=${searchQuery}`;
    return posts({ url, signal, cheerio });
};
exports.getSearchPosts = getSearchPosts;
async function posts({ url, signal, cheerio, }) {
    try {
        const res = await fetch(url, { signal });
        const data = await res.text();
        const $ = cheerio.load(data);
        const catalog = [];
        $(".items.full")
            .children()
            .map((i, element) => {
            const title = $(element).find(".poster").find("img").attr("alt");
            const link = $(element).find(".poster").find("a").attr("href");
            const image = $(element).find(".poster").find("img").attr("data-src") ||
                $(element).find(".poster").find("img").attr("src");
            if (title && link && image) {
                catalog.push({
                    title: title,
                    link: link,
                    image: image,
                });
            }
        });
        return catalog;
    }
    catch (err) {
        console.error("multiGetPosts error ", err);
        return [];
    }
}
