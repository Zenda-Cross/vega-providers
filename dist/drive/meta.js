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
            const type = $(".left-wrapper")
                .text()
                .toLocaleLowerCase()
                .includes("movie name")
                ? "movie"
                : "series";
            const imdbId = ((_b = $('a:contains("IMDb")').attr("href")) === null || _b === void 0 ? void 0 : _b.split("/")[4]) || "";
            const title = $(".left-wrapper").find('strong:contains("Name")').next().text() ||
                $(".left-wrapper")
                    .find('strong:contains("Name"),h5:contains("Name")')
                    .find("span:first")
                    .text();
            const synopsis = $(".left-wrapper")
                .find('h2:contains("Storyline"),h3:contains("Storyline"),h5:contains("Storyline"),h4:contains("Storyline"),h4:contains("STORYLINE")')
                .next()
                .text() ||
                $(".ipc-html-content-inner-div").text() ||
                "";
            const image = $("img.entered.lazyloaded,img.entered,img.litespeed-loaded").attr("src") ||
                $("img.aligncenter").attr("src") ||
                "";
            // Links
            const links = [];
            $('a:contains("1080")a:not(:contains("Zip")),a:contains("720")a:not(:contains("Zip")),a:contains("480")a:not(:contains("Zip")),a:contains("2160")a:not(:contains("Zip")),a:contains("4k")a:not(:contains("Zip"))').map((i, element) => {
                var _a;
                const title = $(element).parent("h5").prev().text();
                const episodesLink = $(element).attr("href");
                const quality = ((_a = title.match(/\b(480p|720p|1080p|2160p)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                if (episodesLink && title) {
                    links.push({
                        title,
                        episodesLink: type === "series" ? episodesLink : "",
                        directLinks: type === "movie"
                            ? [{ title: "Movie", link: episodesLink, type: "movie" }]
                            : [],
                        quality: quality,
                    });
                }
            });
            // console.log('drive meta', title, synopsis, image, imdbId, type, links);
            console.log("drive meta", links, type);
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
