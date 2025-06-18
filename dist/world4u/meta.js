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
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b;
        try {
            const { axios, cheerio } = providerContext;
            const url = link;
            const res = yield axios.get(url);
            const data = res.data;
            const $ = cheerio.load(data);
            const type = $(".entry-content")
                .text()
                .toLocaleLowerCase()
                .includes("movie name")
                ? "movie"
                : "series";
            const imdbId = ((_b = $(".imdb_left").find("a").attr("href")) === null || _b === void 0 ? void 0 : _b.split("/")[4]) || "";
            const title = $(".entry-content")
                .find('strong:contains("Name")')
                .children()
                .remove()
                .end()
                .text()
                .replace(":", "");
            const synopsis = $(".entry-content")
                .find('p:contains("Synopsis"),p:contains("Plot"),p:contains("Story")')
                .children()
                .remove()
                .end()
                .text();
            const image = $(".wp-caption").find("img").attr("data-src") ||
                $(".entry-content").find("img").attr("data-src") ||
                "";
            const links = [];
            $(".my-button").map((i, element) => {
                var _a;
                const title = $(element).parent().parent().prev().text();
                const episodesLink = $(element).attr("href");
                const quality = ((_a = title.match(/\b(480p|720p|1080p|2160p)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                if (episodesLink && title) {
                    links.push({
                        title,
                        episodesLink: type === "series" ? episodesLink : "",
                        directLinks: type === "movie"
                            ? [
                                {
                                    link: episodesLink,
                                    title,
                                    type: "movie",
                                },
                            ]
                            : [],
                        quality,
                    });
                }
            });
            return {
                title,
                synopsis,
                image,
                imdbId,
                type,
                linkList: links,
            };
        }
        catch (err) {
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
