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
            const container = $(".yQ8hqd.ksSzJd.LoQAYe").html()
                ? $(".yQ8hqd.ksSzJd.LoQAYe")
                : $(".FxvUNb");
            const imdbId = ((_b = container
                .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
                .attr("href")) === null || _b === void 0 ? void 0 : _b.split("/")[4]) || "";
            const title = container
                .find('li:contains("Name")')
                .children()
                .remove()
                .end()
                .text();
            const type = $(".yQ8hqd.ksSzJd.LoQAYe").html() ? "series" : "movie";
            const synopsis = container.find('li:contains("Stars")').text();
            const image = $('h4:contains("SCREENSHOTS")').next().find("img").attr("src") || "";
            console.log("katGetInfo", title, synopsis, image, imdbId, type);
            // Links
            const links = [];
            const directLink = [];
            // direct links
            $(".entry-content")
                .find('p:contains("Episode")')
                .each((i, element) => {
                const dlLink = $(element)
                    .nextAll("h3,h2")
                    .first()
                    .find('a:contains("1080"),a:contains("720"),a:contains("480")')
                    .attr("href") || "";
                const dlTitle = $(element).find("span").text();
                if (link.trim().length > 0 && dlTitle.includes("Episode ")) {
                    directLink.push({
                        title: dlTitle,
                        link: dlLink,
                    });
                }
            });
            if (directLink.length > 0) {
                links.push({
                    quality: "",
                    title: title,
                    directLinks: directLink,
                });
            }
            $(".entry-content")
                .find("pre")
                .nextUntil("div")
                .filter("h2")
                .each((i, element) => {
                var _a;
                const link = $(element).find("a").attr("href");
                const quality = ((_a = $(element)
                    .text()
                    .match(/\b(480p|720p|1080p|2160p)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                const title = $(element).text();
                if (link && title.includes("")) {
                    links.push({
                        quality,
                        title,
                        episodesLink: link,
                    });
                }
            });
            if (links.length === 0 && type === "movie") {
                $(".entry-content")
                    .find('h2:contains("DOWNLOAD"),h3:contains("DOWNLOAD")')
                    .nextUntil("pre,div")
                    .filter("h2")
                    .each((i, element) => {
                    var _a;
                    const link = $(element).find("a").attr("href");
                    const quality = ((_a = $(element)
                        .text()
                        .match(/\b(480p|720p|1080p|2160p)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                    const title = $(element).text();
                    if (link && !title.includes("Online")) {
                        links.push({
                            quality,
                            title,
                            directLinks: [{ link, title, type: "movie" }],
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
