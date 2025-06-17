"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl, axios } = providerContext;
    const baseUrl = await getBaseUrl("consumet");
    const url = `${baseUrl + filter}?page=${page}`;
    return posts({ url, signal, axios });
};
exports.getPosts = getPosts;
const getSearchPosts = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl, axios } = providerContext;
    const baseUrl = await getBaseUrl("consumet");
    const url = `${baseUrl}/anime/zoro/${searchQuery}?page=${page}`;
    return posts({ url, signal, axios });
};
exports.getSearchPosts = getSearchPosts;
async function posts({ url, signal, axios, }) {
    try {
        const res = await axios.get(url, { signal });
        const data = res.data?.results;
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
        console.error("zoro error ", err);
        return [];
    }
}
