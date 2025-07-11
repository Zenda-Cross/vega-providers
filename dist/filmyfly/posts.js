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
    return __awaiter(this, arguments, void 0, function* ({ filter, page, signal, providerContext, }) {
        const { getBaseUrl } = providerContext;
        const baseUrl = yield getBaseUrl("filmyfly");
        const url = `${baseUrl + filter}/${page}`;
        return posts({ url, signal, baseUrl, providerContext });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        const { getBaseUrl } = providerContext;
        const baseUrl = yield getBaseUrl("filmyfly");
        const url = `${baseUrl}/site-1.html?to-search=${searchQuery}`;
        if (page > 1) {
            return [];
        }
        return posts({ url, signal, baseUrl, providerContext });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, signal, baseUrl, providerContext, }) {
        try {
            const { cheerio, commonHeaders: headers } = providerContext;
            const res = yield fetch(url, { headers, signal });
            const data = yield res.text();
            const $ = cheerio.load(data);
            const catalog = [];
            $(".A2,.A10,.fl").map((i, element) => {
                const title = $(element).find("a").eq(1).text() || $(element).find("b").text();
                const link = $(element).find("a").attr("href");
                const image = $(element).find("img").attr("src");
                if (title && link && image) {
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
            console.error("ff error ", err);
            return [];
        }
    });
}
