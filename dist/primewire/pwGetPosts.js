"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pwGetPostsSearch = exports.pwGetPosts = void 0;
const pwGetPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl('primewire');
    const url = `${baseUrl + filter}&page=${page}`;
    return posts({ baseUrl, url, signal, axios, cheerio });
};
exports.pwGetPosts = pwGetPosts;
const pwGetPostsSearch = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio, Aes } = providerContext;
    const getSHA256ofJSON = async function (input) {
        return await Aes.sha1(input);
    };
    const baseUrl = await getBaseUrl('primewire');
    const hash = await getSHA256ofJSON(searchQuery + 'JyjId97F9PVqUPuMO0');
    const url = `${baseUrl}/filter?s=${searchQuery}&page=${page}&ds=${hash.slice(0, 10)}`;
    return posts({ baseUrl, url, signal, axios, cheerio });
};
exports.pwGetPostsSearch = pwGetPostsSearch;
async function posts({ baseUrl, url, signal, axios, cheerio, }) {
    try {
        const res = await axios.get(url, { signal });
        const data = res.data;
        const $ = cheerio.load(data);
        const catalog = [];
        $('.index_item.index_item_ie').map((i, element) => {
            const title = $(element).find('a').attr('title');
            const link = $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src') || '';
            if (title && link) {
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
        console.error('primewire error ', err);
        return [];
    }
}
