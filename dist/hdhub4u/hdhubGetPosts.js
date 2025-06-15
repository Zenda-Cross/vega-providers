"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hdhubGetPostsSearch = exports.hdhubGetPosts = void 0;
const hdbHeaders = {
    Cookie: 'xla=s4t',
    Referer: 'https://google.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
};
const hdhubGetPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl('hdhub');
    const url = `${baseUrl + filter}/page/${page}/`;
    return posts({ url, signal, providerContext });
};
exports.hdhubGetPosts = hdhubGetPosts;
const hdhubGetPostsSearch = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl('hdhub');
    const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
    return posts({ url, signal, providerContext });
};
exports.hdhubGetPostsSearch = hdhubGetPostsSearch;
async function posts({ url, signal, providerContext, }) {
    const { cheerio } = providerContext;
    try {
        const res = await fetch(url, {
            headers: hdbHeaders,
            signal,
        });
        const data = await res.text();
        const $ = cheerio.load(data);
        const catalog = [];
        $('.recent-movies')
            .children()
            .map((i, element) => {
            const title = $(element).find('figure').find('img').attr('alt');
            const link = $(element).find('a').attr('href');
            const image = $(element).find('figure').find('img').attr('src');
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
        console.error('hdhubGetPosts error ', err);
        return [];
    }
}
