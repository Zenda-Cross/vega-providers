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
exports.getEpisodes = void 0;
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        var _b;
        try {
            if (!url.includes("luxelinks") || url.includes("luxecinema")) {
                const res = yield providerContext.axios.get(url, {
                    headers: providerContext.commonHeaders,
                });
                const data = res.data;
                const encodedLink = (_b = data.match(/"link":"([^"]+)"/)) === null || _b === void 0 ? void 0 : _b[1];
                if (encodedLink) {
                    url = encodedLink ? atob(encodedLink) : url;
                }
                else {
                    const redirectUrlRes = yield fetch("https://ext.8man.me/api/cinemaluxe", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ url }),
                    });
                    const redirectUrl = yield redirectUrlRes.json();
                    url = (redirectUrl === null || redirectUrl === void 0 ? void 0 : redirectUrl.redirectUrl) || url;
                }
            }
            const res = yield providerContext.axios.get(url, {
                headers: providerContext.commonHeaders,
            });
            const html = res.data;
            let $ = providerContext.cheerio.load(html);
            const episodeLinks = [];
            if (url.includes("luxedrive")) {
                episodeLinks.push({
                    title: "Movie",
                    link: url,
                });
                return episodeLinks;
            }
            $("a.maxbutton-4,a.maxbutton,.maxbutton-hubcloud,.ep-simple-button").map((i, element) => {
                var _a;
                const title = (_a = $(element).text()) === null || _a === void 0 ? void 0 : _a.trim();
                const link = $(element).attr("href");
                if (title &&
                    link &&
                    !title.includes("Batch") &&
                    !title.toLowerCase().includes("zip")) {
                    episodeLinks.push({
                        title: title
                            .replace(/\(\d{4}\)/, "")
                            .replace("Download", "Movie")
                            .replace("⚡", "")
                            .trim(),
                        link,
                    });
                }
            });
            return episodeLinks;
        }
        catch (err) {
            console.error("cl episode links", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
