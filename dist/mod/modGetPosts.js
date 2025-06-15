"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modGetPostsSearch = exports.modGetPosts = void 0;
const modGetPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('Moviesmod');
    const url = `${baseUrl + filter}/page/${page}/`;
    return posts({ url, signal, axios, cheerio });
};
exports.modGetPosts = modGetPosts;
const modGetPostsSearch = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('Moviesmod');
    const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
    return posts({ url, signal, axios, cheerio });
};
exports.modGetPostsSearch = modGetPostsSearch;
async function posts({ url, signal, axios, cheerio, }) {
    try {
        const res = await axios.get(url, { signal });
        const data = res.data;
        const $ = cheerio.load(data);
        const catalog = [];
        $('.post-cards')
            .find('article')
            .map((i, element) => {
            const title = $(element).find('a').attr('title');
            const link = $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
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
        console.error('modGetPosts error ', err);
        return [];
    }
}
