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
        const baseURL = yield getBaseUrl("tokyoinsider");
        const start = page < 2 ? 0 : (page - 1) * 20;
        const url = `${baseURL}/${filter}&start=${start}`;
        return posts({ baseURL, url, signal, axios, cheerio });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, 
    // providerValue,
    signal, providerContext, }) {
        const { getBaseUrl, axios, cheerio } = providerContext;
        const baseURL = yield getBaseUrl("tokyoinsider");
        const start = page < 2 ? 0 : (page - 1) * 20;
        const url = `${baseURL}/anime/search?k=${searchQuery}&start=${start}`;
        return posts({ baseURL, url, signal, axios, cheerio });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ baseURL, url, signal, axios, cheerio, }) {
        try {
            const res = yield axios.get(url, { signal });
            const data = res.data;
            const $ = cheerio.load(data);
            const catalog = [];
            $('td.c_h2[width="40"]').map((i, element) => {
                var _a;
                const image = (_a = $(element)
                    .find(".a_img")
                    .attr("src")) === null || _a === void 0 ? void 0 : _a.replace("small", "default");
                const title = $(element).find("a").attr("title");
                const link = baseURL + $(element).find("a").attr("href");
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
