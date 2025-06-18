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
const hdbHeaders = {
    Cookie: "xla=s4t",
    Referer: "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b;
        try {
            const { axios, cheerio } = providerContext;
            const url = link;
            const res = yield axios.get(url, { headers: hdbHeaders });
            const data = res.data;
            const $ = cheerio.load(data);
            const container = $(".page-body");
            const imdbId = ((_b = container
                .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
                .attr("href")) === null || _b === void 0 ? void 0 : _b.split("/")[4]) || "";
            const title = container
                .find('h2[data-ved="2ahUKEwjL0NrBk4vnAhWlH7cAHRCeAlwQ3B0oATAfegQIFBAM"],h2[data-ved="2ahUKEwiP0pGdlermAhUFYVAKHV8tAmgQ3B0oATAZegQIDhAM"]')
                .text();
            const type = title.toLocaleLowerCase().includes("season")
                ? "series"
                : "movie";
            const synopsis = container
                .find('strong:contains("DESCRIPTION")')
                .parent()
                .text()
                .replace("DESCRIPTION:", "");
            const image = container.find('img[decoding="async"]').attr("src") || "";
            // Links
            const links = [];
            const directLink = [];
            // direct link type
            $('strong:contains("EPiSODE")').map((i, element) => {
                const epTitle = $(element).parent().parent().text();
                const episodesLink = $(element)
                    .parent()
                    .parent()
                    .parent()
                    .next()
                    .next()
                    .find("a")
                    .attr("href") ||
                    $(element).parent().parent().parent().next().find("a").attr("href");
                if (episodesLink && episodesLink) {
                    directLink.push({
                        title: epTitle,
                        link: episodesLink,
                    });
                }
            });
            if (directLink.length === 0) {
                container.find('a:contains("EPiSODE")').map((i, element) => {
                    const epTitle = $(element).text();
                    const episodesLink = $(element).attr("href");
                    if (episodesLink) {
                        directLink.push({
                            title: epTitle.toLocaleUpperCase(),
                            link: episodesLink,
                        });
                    }
                });
            }
            if (directLink.length > 0) {
                links.push({
                    title: title,
                    directLinks: directLink,
                });
            }
            if (directLink.length === 0) {
                container
                    .find('a:contains("480"),a:contains("720"),a:contains("1080"),a:contains("2160"),a:contains("4K")')
                    .map((i, element) => {
                    var _a;
                    const quality = ((_a = $(element)
                        .text()
                        .match(/\b(480p|720p|1080p|2160p)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                    const movieLinks = $(element).attr("href");
                    const title = $(element).text();
                    if (movieLinks) {
                        links.push({
                            directLinks: [
                                { link: movieLinks, title: "Movie", type: "movie" },
                            ],
                            quality: quality,
                            title: title,
                        });
                    }
                });
            }
            // console.log('drive meta', title, synopsis, image, imdbId, type, links);
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
