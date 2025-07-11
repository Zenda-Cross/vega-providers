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
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};
const getPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ filter, page, 
// providerValue,
signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = yield getBaseUrl("UhdMovies");
    const url = page === 1 ? `${baseUrl}/${filter}/` : `${baseUrl + filter}/page/${page}/`;
    console.log("url", url);
    return posts(baseUrl, url, signal, providerContext);
});
exports.getPosts = getPosts;
const getSearchPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ searchQuery, page, 
// providerValue,
signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = yield getBaseUrl("UhdMovies");
    const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
    return posts(baseUrl, url, signal, providerContext);
});
exports.getSearchPosts = getSearchPosts;
function posts(baseURL, url, signal, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers, signal });
            const html = res.data;
            const $ = cheerio.load(html);
            const uhdCatalog = [];
            $(".gridlove-posts")
                .find(".layout-masonry")
                .each((index, element) => {
                const title = $(element).find("a").attr("title");
                const link = $(element).find("a").attr("href");
                const image = $(element).find("a").find("img").attr("src");
                if (title && link && image) {
                    uhdCatalog.push({
                        title: title.replace("Download", "").trim(),
                        link: link,
                        image: image,
                    });
                }
            });
            return uhdCatalog;
        }
        catch (err) {
            console.error("uhd error ", err);
            return [];
        }
    });
}
