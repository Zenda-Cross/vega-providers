"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sbGetPostsSearch = exports.sbGetPosts = void 0;
const sbGetPosts = async function ({ filter, page, 
// providerValue,
signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('showbox');
    const url = `${baseUrl + filter}?page=${page}/`;
    return posts({ url, signal, baseUrl, axios, cheerio });
};
exports.sbGetPosts = sbGetPosts;
const sbGetPostsSearch = async function ({ searchQuery, page, 
// providerValue,
signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('showbox');
    const url = `${baseUrl}/search?keyword=${searchQuery}&page=${page}`;
    return posts({ url, signal, baseUrl, axios, cheerio });
};
exports.sbGetPostsSearch = sbGetPostsSearch;
async function posts({ url, signal, 
// baseUrl,
axios, cheerio, }) {
    try {
        const res = await axios.get(url, { signal });
        const data = res.data;
        const $ = cheerio.load(data);
        const catalog = [];
        $('.movie-item').map((i, element) => {
            const title = $(element).find('.movie-title').text();
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
        return [];
    }
}
