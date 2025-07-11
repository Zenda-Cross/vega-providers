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
exports.getStream = void 0;
const getStream = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link, signal, providerContext, }) {
    var _b;
    try {
        let newLink = link;
        console.log("getStream 1", link);
        if (link.includes("linkstore")) {
            console.log("linkstore detected");
            const res = yield fetch(link, {
                signal,
                headers: {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    priority: "u=0, i",
                    "sec-ch-ua": '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "none",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    cookie: "PHPSESSID=9o57cff841dqtv8djtn1rp1712; ext_name=ojplmecpdpgccookcobabopnaifgidhf",
                },
            });
            const html = yield res.text();
            const refreshMetaMatch = html.match(/<meta\s+http-equiv="refresh"\s+content="[^"]*url=([^"]+)"/i);
            if (refreshMetaMatch && refreshMetaMatch[1]) {
                link = refreshMetaMatch[1];
            }
        }
        else {
            console.log("linkstore not detected");
        }
        console.log("getStream 2", link);
        if (link.includes("luxedrive")) {
            const res = yield providerContext.axios.get(link, { signal });
            const $ = providerContext.cheerio.load(res.data);
            const hubcloudLink = $("a.btn.hubcloud").attr("href");
            if (hubcloudLink) {
                newLink = hubcloudLink;
            }
            else {
                const gdFlixLink = $("a.btn.gdflix").attr("href");
                if (gdFlixLink) {
                    newLink = gdFlixLink;
                }
            }
        }
        if (newLink.includes("flix")) {
            const sreams = yield providerContext.extractors.gdFlixExtracter(newLink, signal);
            return sreams;
        }
        const res2 = yield providerContext.axios.get(newLink, { signal });
        const data2 = res2.data;
        const hcLink = ((_b = data2.match(/location\.replace\('([^']+)'/)) === null || _b === void 0 ? void 0 : _b[1]) || newLink;
        const hubCloudLinks = yield providerContext.extractors.hubcloudExtracter(hcLink.includes("https://hubcloud") ? hcLink : newLink, signal);
        return hubCloudLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getStream = getStream;
