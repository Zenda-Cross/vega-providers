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
            const baseUrl = link.split("/").slice(0, 3).join("/");
            const res = yield axios.get(url);
            const html = yield res.data;
            const $ = cheerio.load(html);
            const imdbId = ((_b = $(".movie_info")
                .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
                .attr("href")) === null || _b === void 0 ? void 0 : _b.split("/")[4]) || "";
            const type = $(".show_season").html() ? "series" : "movie";
            const linkList = [];
            $(".show_season").each((i, element) => {
                const seasonTitle = "Season " + $(element).attr("data-id");
                const episodes = [];
                $(element)
                    .children()
                    .each((i, element2) => {
                    const episodeTitle = $(element2)
                        .find("a")
                        .children()
                        .remove()
                        .end()
                        .text()
                        .trim()
                        .replace("E", "Epiosode ");
                    const episodeLink = baseUrl + $(element2).find("a").attr("href");
                    if (episodeTitle && episodeLink) {
                        episodes.push({
                            title: episodeTitle,
                            link: episodeLink,
                        });
                    }
                });
                linkList.push({
                    title: seasonTitle,
                    directLinks: episodes,
                });
            });
            if (type === "movie") {
                linkList.push({
                    title: "Movie",
                    directLinks: [
                        {
                            link: link,
                            title: "Movie",
                            type: "movie",
                        },
                    ],
                });
            }
            return {
                title: "",
                image: "",
                imdbId: imdbId,
                synopsis: "",
                type: type,
                linkList: linkList,
            };
        }
        catch (error) {
            console.error(error);
            return {
                title: "",
                image: "",
                imdbId: "",
                synopsis: "",
                linkList: [],
                type: "uhd",
            };
        }
    });
};
exports.getMeta = getMeta;
