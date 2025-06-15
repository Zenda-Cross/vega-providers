"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driveGetSearchPost = exports.driveGetPosts = void 0;
const driveGetPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl('drive');
    const url = `${baseUrl + filter}/page/${page}/`;
    return posts({ url, signal, providerContext });
};
exports.driveGetPosts = driveGetPosts;
const driveGetSearchPost = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl('drive');
    const url = `${baseUrl}page/${page}/?s=${searchQuery}`;
    return posts({ url, signal, providerContext });
};
exports.driveGetSearchPost = driveGetSearchPost;
async function posts({ url, signal, providerContext, }) {
    try {
        const { cheerio } = providerContext;
        const res = await fetch(url, { signal });
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
        console.error('drive error ', err);
        return [];
    }
}
