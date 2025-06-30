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
        const { axios, cheerio, getBaseUrl } = providerContext;
        try {
            const res = yield axios.get(url);
            const baseUrl = yield getBaseUrl("moviezwap");
            const html = res.data;
            const $ = cheerio.load(html);
            const episodeLinks = [];
            $('a[href*="download.php?file="], a[href*="dwload.php?file="]').each((i, el) => {
                var _a;
                const downloadPage = ((_a = $(el).attr("href")) === null || _a === void 0 ? void 0 : _a.replace("dwload.php", "download.php")) || "";
                let text = $(el).text().trim();
                if (text.includes("Download page")) {
                    // Remove "Download" from the text
                    text = "Play";
                }
                if (downloadPage && text) {
                    // Only add links with quality in text
                    episodeLinks.push({
                        title: text,
                        link: baseUrl + downloadPage,
                    });
                }
            });
            return episodeLinks;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
