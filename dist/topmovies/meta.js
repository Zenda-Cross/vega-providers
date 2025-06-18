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
            const meta = {
                title: $(".imdbwp__title").text(),
                synopsis: $(".imdbwp__teaser").text(),
                image: $(".imdbwp__thumb").find("img").attr("src") || "",
                imdbId: ((_b = $(".imdbwp__link").attr("href")) === null || _b === void 0 ? void 0 : _b.split("/")[4]) || "",
                type: $(".thecontent").text().toLocaleLowerCase().includes("season")
                    ? "series"
                    : "movie",
            };
            const links = [];
            $("h3,h4").map((i, element) => {
                var _a;
                const seriesTitle = $(element).text();
                // const batchZipLink = $(element)
                //   .next("p")
                //   .find(".maxbutton-batch-zip,.maxbutton-zip-download")
                //   .attr("href");
                const episodesLink = $(element)
                    .next("p")
                    .find(".maxbutton-episode-links,.maxbutton-g-drive,.maxbutton-af-download")
                    .attr("href");
                const movieLink = $(element)
                    .next("p")
                    .find(".maxbutton-download-links")
                    .attr("href");
                if (movieLink ||
                    (episodesLink && episodesLink !== "javascript:void(0);")) {
                    links.push({
                        title: seriesTitle.replace("Download ", "").trim() || "Download",
                        episodesLink: episodesLink || "",
                        directLinks: movieLink
                            ? [{ link: movieLink, title: "Movie", type: "movie" }]
                            : [],
                        quality: ((_a = seriesTitle === null || seriesTitle === void 0 ? void 0 : seriesTitle.match(/\d+p\b/)) === null || _a === void 0 ? void 0 : _a[0]) || "",
                    });
                }
            });
            // console.log('mod meta', links);
            return Object.assign(Object.assign({}, meta), { linkList: links });
        }
        catch (err) {
            console.error(err);
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
