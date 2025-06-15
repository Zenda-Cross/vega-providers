"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.katGetPostsSearch = exports.katGetPosts = void 0;
const katGetPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('kat');
    const url = `${baseUrl + filter}/page/${page}/`;
    return posts({ url, signal, cheerio });
};
exports.katGetPosts = katGetPosts;
const katGetPostsSearch = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('kat');
    const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
    return posts({ url, signal, cheerio });
};
exports.katGetPostsSearch = katGetPostsSearch;
async function posts({ url, signal, cheerio, }) {
    try {
        const res = await fetch(url, { signal });
        const data = await res.text();
        const $ = cheerio.load(data);
        const catalog = [];
        $('.recent-posts')
            .children()
            .map((i, element) => {
            const title = $(element).find('img').attr('alt');
            const link = $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
            if (title && link && image) {
                catalog.push({
                    title: title.replace('Download', '').trim(),
                    link: link,
                    image: image,
                });
            }
        });
        return catalog;
    }
    catch (err) {
        console.error('katmovies error ', err);
        return [];
    }
}
