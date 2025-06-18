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
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: url, type, signal, providerContext, }) {
        var _b, _c;
        const headers = providerContext.commonHeaders;
        try {
            if (type === "movie") {
                const res = yield providerContext.axios.get(url, { headers });
                const html = res.data;
                const $ = providerContext.cheerio.load(html);
                const link = $('a:contains("HubCloud")').attr("href");
                url = link || url;
            }
            const res = yield providerContext.axios.get(url, { headers });
            let redirectUrl = (_b = res.data.match(/<meta\s+http-equiv="refresh"\s+content="[^"]*?;\s*url=([^"]+)"\s*\/?>/i)) === null || _b === void 0 ? void 0 : _b[1];
            if (url.includes("/archives/")) {
                redirectUrl = (_c = res.data.match(/<a\s+[^>]*href="(https:\/\/hubcloud\.[^\/]+\/[^"]+)"/i)) === null || _c === void 0 ? void 0 : _c[1];
            }
            if (!redirectUrl) {
                return yield providerContext.extractors.hubcloudExtracter(url, signal);
            }
            const res2 = yield providerContext.axios.get(redirectUrl, { headers });
            const data = res2.data;
            const $ = providerContext.cheerio.load(data);
            const hubcloudLink = $(".fa-file-download").parent().attr("href");
            return yield providerContext.extractors.hubcloudExtracter((hubcloudLink === null || hubcloudLink === void 0 ? void 0 : hubcloudLink.includes("https://hubcloud")) ? hubcloudLink : redirectUrl, signal);
        }
        catch (err) {
            console.error("Movies Drive err", err);
            return [];
        }
    });
};
exports.getStream = getStream;
