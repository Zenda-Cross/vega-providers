"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = async function ({ filter, signal, providerContext, }) {
    const { getBaseUrl, axios } = providerContext;
    const baseUrl = await getBaseUrl("kissKh");
    const url = `${baseUrl + filter}&type=0`;
    try {
        const res = await axios.get(url, { signal });
        const data = res.data?.data;
        const catalog = [];
        data?.map((element) => {
            const title = element.title;
            const link = baseUrl + `/api/DramaList/Drama/${element?.id}?isq=false`;
            const image = element.thumbnail;
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
        console.error("kiss error ", err);
        return [];
    }
};
exports.getPosts = getPosts;
const getSearchPosts = async function ({ searchQuery, signal, providerContext, }) {
    const { getBaseUrl, axios } = providerContext;
    const baseUrl = await getBaseUrl("kissKh");
    const url = `${baseUrl}/api/DramaList/Search?q=${searchQuery}&type=0`;
    try {
        const res = await axios.get(url, { signal });
        const data = res.data;
        const catalog = [];
        data?.map((element) => {
            const title = element.title;
            const link = baseUrl + `/api/DramaList/Drama/${element?.id}?isq=false`;
            const image = element.thumbnail;
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
        console.error("kiss error ", err);
        return [];
    }
};
exports.getSearchPosts = getSearchPosts;
