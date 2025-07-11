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
        const baseUrl = yield getBaseUrl("vadapav");
        if (page > 1) {
            return [];
        }
        const url = `${baseUrl + filter}`;
        return posts({ baseUrl, url, signal, axios, cheerio });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, 
    // providerValue,
    signal, providerContext, }) {
        const { getBaseUrl, axios, cheerio } = providerContext;
        const baseUrl = yield getBaseUrl("vadapav");
        if (page > 1) {
            return [];
        }
        const url = `${baseUrl}/s/${searchQuery}`;
        return posts({ baseUrl, url, signal, axios, cheerio });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ 
    // baseUrl,
    url, signal, axios, cheerio, }) {
        try {
            const res = yield axios.get(url, { signal });
            const data = res.data;
            const $ = cheerio.load(data);
            const catalog = [];
            $('.directory-entry:not(:contains("Parent Directory"))').map((i, element) => {
                var _a;
                const title = $(element).text();
                const link = $(element).attr("href");
                const imageTitle = (title === null || title === void 0 ? void 0 : title.length) > 30
                    ? (_a = title === null || title === void 0 ? void 0 : title.slice(0, 30)) === null || _a === void 0 ? void 0 : _a.replace(/\./g, " ")
                    : title === null || title === void 0 ? void 0 : title.replace(/\./g, " ");
                const image = `https://placehold.jp/23/000000/ffffff/200x400.png?text=${encodeURIComponent(imageTitle)}&css=%7B%22background%22%3A%22%20-webkit-gradient(linear%2C%20left%20bottom%2C%20left%20top%2C%20from(%233f3b3b)%2C%20to(%23000000))%22%2C%22text-transform%22%3A%22%20capitalize%22%7D`;
                if (title && link) {
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
