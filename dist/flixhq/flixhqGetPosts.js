"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flixhqGetSearchPost = exports.flixhqGetPosts = void 0;
const flixhqGetPosts = async function ({ filter, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const urlRes = await getBaseUrl('consumet');
    const baseUrl = urlRes + '/movies/flixhq';
    const url = `${baseUrl + filter}`;
    return posts({ url, signal, providerContext });
};
exports.flixhqGetPosts = flixhqGetPosts;
const flixhqGetSearchPost = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const urlRes = await getBaseUrl('consumet');
    const baseUrl = urlRes + '/movies/flixhq';
    const url = `${baseUrl}/${searchQuery}?page=${page}`;
    return posts({ url, signal, providerContext });
};
exports.flixhqGetSearchPost = flixhqGetSearchPost;
async function posts({ url, signal, providerContext, }) {
    try {
        const { axios } = providerContext;
        const res = await axios.get(url, { signal });
        const data = res.data?.results || res.data;
        const catalog = [];
        data?.map((element) => {
            const title = element.title;
            const link = element.id;
            const image = element.image;
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
        console.error('flixhq error ', err);
        return [];
    }
}
