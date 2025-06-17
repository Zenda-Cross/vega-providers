"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = async function ({ filter, page, signal, providerContext, }) {
    const baseUrl = await providerContext.getBaseUrl("cinemaLuxe");
    const url = `${baseUrl + filter}page/${page}/`;
    return posts({ url, signal, providerContext });
};
exports.getPosts = getPosts;
const getSearchPosts = async function ({ searchQuery, page, signal, providerContext, }) {
    const baseUrl = await providerContext.getBaseUrl("cinemaLuxe");
    const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
    return posts({ url, signal, providerContext });
};
exports.getSearchPosts = getSearchPosts;
async function posts({ url, signal, providerContext, }) {
    try {
        const res = await fetch(url, {
            headers: providerContext.commonHeaders,
            signal,
        });
        const data = await res.text();
        const $ = providerContext.cheerio.load(data);
        const catalog = [];
        $(".item.tvshows,.item.movies").map((i, element) => {
            const title = $(element).find(".poster").find("img").attr("alt");
            const link = $(element).find(".poster").find("a").attr("href");
            const image = $(element).find(".poster").find("img").attr("data-src");
            if (title && link && image) {
                catalog.push({
                    title: title,
                    link: link,
                    image: image,
                });
            }
        });
        $(".result-item").map((i, element) => {
            const title = $(element).find(".thumbnail").find("img").attr("alt");
            const link = $(element).find(".thumbnail").find("a").attr("href");
            const image = $(element).find(".thumbnail").find("img").attr("data-src");
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
        console.error("cinemaluxe error ", err);
        return [];
    }
}
