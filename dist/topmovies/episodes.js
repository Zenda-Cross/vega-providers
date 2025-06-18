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
        const { axios, cheerio } = providerContext;
        try {
            if (url.includes("url=")) {
                url = atob(url.split("url=")[1]);
            }
            const res = yield axios.get(url);
            const html = res.data;
            let $ = cheerio.load(html);
            if (url.includes("url=")) {
                const newUrl = (_b = $("meta[http-equiv='refresh']")
                    .attr("content")) === null || _b === void 0 ? void 0 : _b.split("url=")[1];
                const res2 = yield axios.get(newUrl || url);
                const html2 = res2.data;
                $ = cheerio.load(html2);
            }
            const episodeLinks = [];
            $("h3,h4").map((i, element) => {
                const seriesTitle = $(element).text();
                const episodesLink = $(element).find("a").attr("href");
                if (episodesLink && episodesLink !== "#") {
                    episodeLinks.push({
                        title: seriesTitle.trim() || "No title found",
                        link: episodesLink || "",
                    });
                }
            });
            $("a.maxbutton").map((i, element) => {
                const seriesTitle = $(element).children("span").text();
                const episodesLink = $(element).attr("href");
                if (episodesLink && episodesLink !== "#") {
                    episodeLinks.push({
                        title: seriesTitle.trim() || "No title found",
                        link: episodesLink || "",
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
