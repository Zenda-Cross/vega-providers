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
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    Cookie: "popads_user_id=6ba8fe60a481387a3249f05aa058822d",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page, signal, providerContext, }) {
        const { getBaseUrl } = providerContext;
        const baseUrl = yield getBaseUrl("Topmovies");
        const url = `${baseUrl + filter}/page/${page}/`;
        return posts(url, signal, providerContext);
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        const { getBaseUrl } = providerContext;
        const baseUrl = yield getBaseUrl("Topmovies");
        const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
        return posts(url, signal, providerContext);
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(url, signal, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers, signal });
            const data = res.data;
            const $ = cheerio.load(data);
            const catalog = [];
            $(".post-cards")
                .find("article")
                .map((i, element) => {
                const title = $(element).find("a").attr("title");
                const link = $(element).find("a").attr("href");
                const image = $(element).find("img").attr("data-src") ||
                    $(element).find("img").attr("src") ||
                    "";
                if (title && link) {
                    catalog.push({
                        title: title.replace("Download", "").trim(),
                        link: link,
                        image: image,
                    });
                }
            });
            // console.log(catalog);
            return catalog;
        }
        catch (err) {
            console.error("mod error ", err);
            return [];
        }
    });
}
