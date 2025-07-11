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
        const baseUrl = yield providerContext.getBaseUrl("cinemaLuxe");
        const url = `${baseUrl + filter}page/${page}/`;
        return posts({ url, signal, providerContext });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        const baseUrl = yield providerContext.getBaseUrl("cinemaLuxe");
        const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
        return posts({ url, signal, providerContext });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, signal, providerContext, }) {
        try {
            const res = yield fetch(url, {
                headers: providerContext.commonHeaders,
                signal,
            });
            const data = yield res.text();
            const $ = providerContext.cheerio.load(data);
            const catalog = [];
            $(".item.tvshows,.item.movies").map((i, element) => {
                const title = $(element).find(".poster").find("img").attr("alt");
                const link = $(element).find(".poster").find("a").attr("href");
                const image = $(element).find(".poster").find("img").attr("data-src");
                if (title && link && image) {
                    catalog.push({
                        title: title,
                        link: link,
                        image: image,
                    });
                }
            });
            $(".result-item").map((i, element) => {
                const title = $(element).find(".thumbnail").find("img").attr("alt");
                const link = $(element).find(".thumbnail").find("a").attr("href");
                const image = $(element).find(".thumbnail").find("img").attr("data-src");
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
            console.error("cinemaluxe error ", err);
            return [];
        }
    });
}
