"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokyoGetPostsSearch = exports.tokyoGetPosts = void 0;
const tokyoGetPosts = async function ({ filter, page, 
// providerValue,
signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseURL = await getBaseUrl('tokyoinsider');
    const start = page < 2 ? 0 : (page - 1) * 20;
    const url = `${baseURL}/${filter}&start=${start}`;
    return posts({ baseURL, url, signal, axios, cheerio });
};
exports.tokyoGetPosts = tokyoGetPosts;
const tokyoGetPostsSearch = async function ({ searchQuery, page, 
// providerValue,
signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseURL = await getBaseUrl('tokyoinsider');
    const start = page < 2 ? 0 : (page - 1) * 20;
    const url = `${baseURL}/anime/search?k=${searchQuery}&start=${start}`;
    return posts({ baseURL, url, signal, axios, cheerio });
};
exports.tokyoGetPostsSearch = tokyoGetPostsSearch;
async function posts({ baseURL, url, signal, axios, cheerio, }) {
    try {
        const res = await axios.get(url, { signal });
        const data = res.data;
        const $ = cheerio.load(data);
        const catalog = [];
        $('td.c_h2[width="40"]').map((i, element) => {
            const image = $(element)
                .find('.a_img')
                .attr('src')
                ?.replace('small', 'default');
            const title = $(element).find('a').attr('title');
            const link = baseURL + $(element).find('a').attr('href');
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
