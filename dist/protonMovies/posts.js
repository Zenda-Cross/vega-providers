"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = async function ({ filter, page, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("protonMovies");
    const url = `${baseUrl + filter}/page/${page}/`;
    return posts({ url, baseUrl, signal, axios, cheerio });
};
exports.getPosts = getPosts;
const getSearchPosts = async function ({ searchQuery, page, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("protonMovies");
    const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
    return posts({ url, baseUrl, signal, axios, cheerio });
};
exports.getSearchPosts = getSearchPosts;
async function posts({ url, baseUrl, signal, axios, cheerio, }) {
    function decodeHtml(encodedArray) {
        // Join array elements into a single string
        const joined = encodedArray.join("");
        // Replace escaped quotes
        const unescaped = joined.replace(/\\"/g, '"').replace(/\\'/g, "'");
        // Remove remaining escape characters
        const cleaned = unescaped
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r");
        // Convert literal string representations back to characters
        const decoded = cleaned
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&");
        return decoded;
    }
    try {
        const res = await axios.get(url, {
            headers: {
                referer: baseUrl,
            },
            signal,
        });
        const data = res.data;
        const regex = /\[(?=.*?"<div class")(.*?)\]/g;
        const htmlArray = data?.match(regex);
        const html = decodeHtml(JSON.parse(htmlArray[htmlArray.length - 1]));
        const $ = cheerio.load(html);
        const catalog = [];
        $(".col.mb-4").map((i, element) => {
            const title = $(element).find("h5").text();
            const link = $(element).find("h5").find("a").attr("href");
            const image = $(element).find("img").attr("data-src") ||
                $(element).find("img").attr("src") ||
                "";
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
        console.error("protonGetPosts error ", err);
        return [];
    }
}
