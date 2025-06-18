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
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
    Cookie: "_lscache_vary=62abf8b96599676eb8ec211cffaeb8ff; ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=n4Y1XTKZ5TfIMBNQuAXzerwKpx0U35KoOm3imfT0GpU-1732097818-1.2.1.1-ZeAnEu.8D9TSZHYDoj7vwo1A1rpdKl304ZpaBn_QbAQOr211JFAb7.JRQU3EL2eIy1Dfl8HhYvH7_259.22lUz8gbchHcQ8hvfuQXMtFMCbqDBLzjNUZa9stuk.39l28IcPhH9Z2szsf3SGtNI1sAfo66Djt7sOReLK3lHw9UkJp7BdGqt6a2X9qAc8EsAI3lE480Tmt0fkHv14Oc30LSbPB_WwFmiqAki2W.Gv9hV7TN_QBFESleTDlXd.6KGflfd4.KwWF7rpSRo_cgoc9ALLLIafpxHVbe7_g5r7zvpml_Pj8fEL75fw.1GBuy16bciHBuB8s_kahuJYUnhtQFFgfTQl8_Gn6KeovBWx.PJ7nFv5sklHUfAyBVq3t30xKe8ZDydsQ_G.yipfj_In5GmmWcXGb6E4.bioDOwW_sKLtxwdTQt7Nu.RkILX_mKvXNpyLqflIVj8G7X5E8I.unw",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
const getPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ filter, page, providerValue, signal, providerContext, }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = yield getBaseUrl("Vega");
    console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
    const url = `${baseUrl}/${filter}/page/${page}/`;
    console.log("vegaGetPosts url:", url);
    return posts(baseUrl, url, signal, headers, axios, cheerio);
});
exports.getPosts = getPosts;
const getSearchPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ searchQuery, page, providerValue, signal, providerContext, }) {
    const { getBaseUrl, axios, commonHeaders, cheerio } = providerContext;
    const baseUrl = yield getBaseUrl("Vega");
    console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
    const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
    console.log("vegaGetPosts url:", url);
    return posts(baseUrl, url, signal, commonHeaders, axios, cheerio);
});
exports.getSearchPosts = getSearchPosts;
function posts(baseUrl_1, url_1, signal_1) {
    return __awaiter(this, arguments, void 0, function* (baseUrl, url, signal, headers = {}, axios, cheerio) {
        var _a, _b;
        try {
            const urlRes = yield axios.get(url, {
                headers: Object.assign(Object.assign({}, headers), { Referer: baseUrl }),
                signal,
            });
            const $ = cheerio.load(urlRes.data);
            const posts = [];
            (_b = (_a = $(".blog-items,.post-list")) === null || _a === void 0 ? void 0 : _a.children("article")) === null || _b === void 0 ? void 0 : _b.each((index, element) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                const post = {
                    title: (((_e = (_d = (_c = (_b = (_a = $(element)) === null || _a === void 0 ? void 0 : _a.find("a")) === null || _b === void 0 ? void 0 : _b.attr("title")) === null || _c === void 0 ? void 0 : _c.replace("Download", "")) === null || _d === void 0 ? void 0 : _d.match(/^(.*?)\s*\((\d{4})\)|^(.*?)\s*\((Season \d+)\)/)) === null || _e === void 0 ? void 0 : _e[0]) ||
                        ((_h = (_g = (_f = $(element)) === null || _f === void 0 ? void 0 : _f.find("a")) === null || _g === void 0 ? void 0 : _g.attr("title")) === null || _h === void 0 ? void 0 : _h.replace("Download", "")) ||
                        ((_k = (_j = $(element)) === null || _j === void 0 ? void 0 : _j.find(".post-title").text()) === null || _k === void 0 ? void 0 : _k.replace("Download", "")) ||
                        "").trim(),
                    link: ((_m = (_l = $(element)) === null || _l === void 0 ? void 0 : _l.find("a")) === null || _m === void 0 ? void 0 : _m.attr("href")) || "",
                    image: $(element).find("a").find("img").attr("data-lazy-src") ||
                        $(element).find("a").find("img").attr("data-src") ||
                        $(element).find("a").find("img").attr("src") ||
                        "",
                };
                if (post.image.startsWith("//")) {
                    post.image = "https:" + post.image;
                }
                posts.push(post);
            });
            // console.log(posts);
            return posts;
        }
        catch (error) {
            console.error("vegaGetPosts error:", error);
            return [];
        }
    });
}
