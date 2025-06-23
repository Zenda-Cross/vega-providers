"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page, 
    // providerValue,
    signal, providerContext, }) {
        const { getBaseUrl, axios, cheerio } = providerContext;
        const baseUrl = yield getBaseUrl("showbox");
        const url = `${baseUrl + filter}?page=${page}/`;
        return posts({ url, signal, baseUrl, axios, cheerio });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, 
    // providerValue,
    signal, providerContext, }) {
        const { getBaseUrl, axios, cheerio } = providerContext;
        const baseUrl = yield getBaseUrl("showbox");
        const url = `${baseUrl}/search?keyword=${searchQuery}&page=${page}`;
        return posts({ url, signal, baseUrl, axios, cheerio });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, signal, 
    // baseUrl,
    axios, cheerio, }) {
        try {
            const res = yield axios.get(url, { signal });
            const data = res.data;
            const $ = cheerio.load(data);
            const catalog = [];
            $(".movie-item,.flw-item").map((i, element) => {
                const title = $(element).find(".film-name").text().trim();
                const link = $(element).find("a").attr("href");
                const image = $(element).find("img").attr("src");
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
    });
}
