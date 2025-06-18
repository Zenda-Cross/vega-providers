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
    return __awaiter(this, arguments, void 0, function* ({ filter, page, providerValue, signal, providerContext, }) {
        try {
            const { getBaseUrl, cheerio } = providerContext;
            const baseUrl = yield getBaseUrl("nfMirror");
            const catalog = [];
            if (page > 1) {
                return [];
            }
            // console.log(filter);
            const isPrime = providerValue === "primeMirror" ? "isPrime=true" : "isPrime=false";
            const url = `https://netmirror.8man.me/api/net-proxy?${isPrime}&url=${baseUrl + filter}`;
            const res = yield fetch(url, {
                signal: signal,
                method: "GET",
                credentials: "omit",
            });
            const data = yield res.text();
            // console.log('nfPost', data);
            const $ = cheerio.load(data);
            $("a.post-data").map((i, element) => {
                const title = "";
                const id = $(element).attr("data-post");
                // console.log('id', id);
                const image = $(element).find("img").attr("data-src") || "";
                if (id) {
                    catalog.push({
                        title: title,
                        link: baseUrl +
                            `${providerValue === "netflixMirror"
                                ? "/post.php?id="
                                : "/pv/post.php?id="}` +
                            id +
                            "&t=" +
                            Math.round(new Date().getTime() / 1000),
                        image: image,
                    });
                }
            });
            // console.log(catalog);
            return catalog;
        }
        catch (err) {
            console.error("nf error ", err);
            return [];
        }
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, providerValue, signal, providerContext, }) {
        var _b;
        const { getBaseUrl } = providerContext;
        try {
            if (page > 1) {
                return [];
            }
            const catalog = [];
            const baseUrl = yield getBaseUrl("nfMirror");
            const isPrime = providerValue === "primeMirror" ? "isPrime=true" : "isPrime=false";
            const url = `https://netmirror.8man.me/api/net-proxy?${isPrime}&url=${baseUrl}${providerValue === "netflixMirror" ? "" : "/pv"}/search.php?s=${encodeURI(searchQuery)}`;
            const res = yield fetch(url, {
                signal: signal,
                method: "GET",
                credentials: "omit",
            });
            const data = yield res.json();
            (_b = data === null || data === void 0 ? void 0 : data.searchResult) === null || _b === void 0 ? void 0 : _b.forEach((result) => {
                const title = (result === null || result === void 0 ? void 0 : result.t) || "";
                const id = result === null || result === void 0 ? void 0 : result.id;
                const image = providerValue === "netflixMirror"
                    ? `https://imgcdn.media/poster/v/${id}.jpg`
                    : "";
                if (id) {
                    catalog.push({
                        title: title,
                        link: baseUrl +
                            `${providerValue === "netflixMirror"
                                ? "/mobile/post.php?id="
                                : "/mobile/pv/post.php?id="}` +
                            id +
                            "&t=" +
                            Math.round(new Date().getTime() / 1000),
                        image: image,
                    });
                }
            });
            return catalog;
        }
        catch (err) {
            console.error("Search error:", err);
            return [];
        }
    });
};
exports.getSearchPosts = getSearchPosts;
