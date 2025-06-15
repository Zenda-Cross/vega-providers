"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffGetPostsSearch = exports.ffGetPosts = void 0;
const ffGetPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl('filmyfly');
    const url = `${baseUrl + filter}/${page}`;
    return posts({ url, signal, baseUrl, providerContext });
};
exports.ffGetPosts = ffGetPosts;
const ffGetPostsSearch = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl('filmyfly');
    const url = `${baseUrl}/site-1.html?to-search=${searchQuery}`;
    if (page > 1) {
        return [];
    }
    return posts({ url, signal, baseUrl, providerContext });
};
exports.ffGetPostsSearch = ffGetPostsSearch;
async function posts({ url, signal, baseUrl, providerContext, }) {
    try {
        const { cheerio, commonHeaders: headers } = providerContext;
        const res = await fetch(url, { headers, signal });
        const data = await res.text();
        const $ = cheerio.load(data);
        const catalog = [];
        $('.A2,.A10,.fl').map((i, element) => {
            const title = $(element).find('a').eq(1).text() || $(element).find('b').text();
            const link = $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
            if (title && link && image) {
                catalog.push({
                    title: title,
                    link: baseUrl + link,
                    image: image,
                });
            }
        });
        return catalog;
    }
    catch (err) {
        console.error('ff error ', err);
        return [];
    }
}
