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
exports.getMeta = void 0;
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
const getMeta = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link, providerContext, }) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    try {
        const { axios, cheerio } = providerContext;
        const url = link;
        console.log("url", url);
        const baseUrl = url.split("/").slice(0, 3).join("/");
        const response = yield axios.get(url, {
            headers: Object.assign(Object.assign({}, headers), { Referer: baseUrl }),
        });
        const $ = cheerio.load(response.data);
        const infoContainer = $(".entry-content,.post-inner");
        const heading = infoContainer === null || infoContainer === void 0 ? void 0 : infoContainer.find("h3");
        const imdbId = 
        //@ts-ignore
        ((_g = (_f = (_e = (_d = (_c = (_b = heading === null || heading === void 0 ? void 0 : heading.next("p")) === null || _b === void 0 ? void 0 : _b.find("a")) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.attribs) === null || _e === void 0 ? void 0 : _e.href) === null || _f === void 0 ? void 0 : _f.match(/tt\d+/g)) === null || _g === void 0 ? void 0 : _g[0]) ||
            ((_h = infoContainer.text().match(/tt\d+/g)) === null || _h === void 0 ? void 0 : _h[0]) ||
            "";
        // console.log(imdbId)
        const type = ((_k = (_j = heading === null || heading === void 0 ? void 0 : heading.next("p")) === null || _j === void 0 ? void 0 : _j.text()) === null || _k === void 0 ? void 0 : _k.includes("Series Name"))
            ? "series"
            : "movie";
        //   console.log(type);
        // title
        const titleRegex = /Name: (.+)/;
        const title = ((_o = (_m = (_l = heading === null || heading === void 0 ? void 0 : heading.next("p")) === null || _l === void 0 ? void 0 : _l.text()) === null || _m === void 0 ? void 0 : _m.match(titleRegex)) === null || _o === void 0 ? void 0 : _o[1]) || "";
        //   console.log(title);
        // synopsis
        const synopsisNode = //@ts-ignore
         (_t = (_s = (_r = (_q = (_p = infoContainer === null || infoContainer === void 0 ? void 0 : infoContainer.find("p")) === null || _p === void 0 ? void 0 : _p.next("h3,h4")) === null || _q === void 0 ? void 0 : _q.next("p")) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.children) === null || _t === void 0 ? void 0 : _t[0];
        const synopsis = synopsisNode && "data" in synopsisNode ? synopsisNode.data : "";
        //   console.log(synopsis);
        // image
        let image = ((_u = infoContainer === null || infoContainer === void 0 ? void 0 : infoContainer.find("img[data-lazy-src]")) === null || _u === void 0 ? void 0 : _u.attr("data-lazy-src")) || "";
        if (image.startsWith("//")) {
            image = "https:" + image;
        }
        // console.log(image);
        // console.log({title, synopsis, image, imdbId, type});
        /// Links
        const hr = (_v = infoContainer === null || infoContainer === void 0 ? void 0 : infoContainer.first()) === null || _v === void 0 ? void 0 : _v.find("hr");
        const list = hr === null || hr === void 0 ? void 0 : hr.nextUntil("hr");
        const links = [];
        list.each((index, element) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            element = $(element);
            // title
            const title = (element === null || element === void 0 ? void 0 : element.text()) || "";
            const quality = ((_a = element === null || element === void 0 ? void 0 : element.text().match(/\d+p\b/)) === null || _a === void 0 ? void 0 : _a[0]) || "";
            // console.log(title);
            // movieLinks
            const movieLinks = (element === null || element === void 0 ? void 0 : element.next().find(".dwd-button").text().toLowerCase().includes("download"))
                ? (_c = (_b = element === null || element === void 0 ? void 0 : element.next().find(".dwd-button")) === null || _b === void 0 ? void 0 : _b.parent()) === null || _c === void 0 ? void 0 : _c.attr("href")
                : "";
            // episode links
            const vcloudLinks = (_e = (_d = element === null || element === void 0 ? void 0 : element.next().find(".btn-outline[style='background:linear-gradient(135deg,#ed0b0b,#f2d152); color: white;'],.btn-outline[style='background:linear-gradient(135deg,#ed0b0b,#f2d152); color: #fdf8f2;']")) === null || _d === void 0 ? void 0 : _d.parent()) === null || _e === void 0 ? void 0 : _e.attr("href");
            console.log(title);
            const episodesLink = (vcloudLinks
                ? vcloudLinks
                : (element === null || element === void 0 ? void 0 : element.next().find(".dwd-button").text().toLowerCase().includes("episode"))
                    ? (_g = (_f = element === null || element === void 0 ? void 0 : element.next().find(".dwd-button")) === null || _f === void 0 ? void 0 : _f.parent()) === null || _g === void 0 ? void 0 : _g.attr("href")
                    : "") ||
                ((_j = (_h = element === null || element === void 0 ? void 0 : element.next().find(".btn-outline[style='background:linear-gradient(135deg,#0ebac3,#09d261); color: white;']")) === null || _h === void 0 ? void 0 : _h.parent()) === null || _j === void 0 ? void 0 : _j.attr("href"));
            if (movieLinks || episodesLink) {
                links.push({
                    title,
                    directLinks: movieLinks
                        ? [{ title: "Movie", link: movieLinks, type: "movie" }]
                        : [],
                    episodesLink,
                    quality,
                });
            }
        });
        // console.log(links);
        return {
            title,
            synopsis,
            image,
            imdbId,
            type,
            linkList: links,
        };
    }
    catch (error) {
        console.log("getInfo error");
        console.error(error);
        // ToastAndroid.show('No response', ToastAndroid.SHORT);
        return {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "",
            linkList: [],
        };
    }
});
exports.getMeta = getMeta;
