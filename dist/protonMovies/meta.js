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
        var _b, _c, _d, _e, _f;
        try {
            const { axios, cheerio, getBaseUrl } = providerContext;
            const baseUrl = yield getBaseUrl("protonMovies");
            console.log("all", link);
            const res = yield axios.get(`${baseUrl}${link}`);
            const data = res.data;
            function decodeHtml(encodedArray) {
                // Join array elements into a single string
                const joined = encodedArray.join("");
                // Replace escaped quotes
                const unescaped = joined.replace(/\\"/g, '"').replace(/\\'/g, "'");
                // Remove remaining escape characters
                const cleaned = unescaped
                    .replace(/\\n/g, "\n")
                    .replace(/\\t/g, "\t")
                    .replace(/\\r/g, "\r");
                // Convert literal string representations back to characters
                const decoded = cleaned
                    .replace(/&quot;/g, '"')
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&");
                return decoded;
            }
            const $$ = cheerio.load(data);
            const htmlArray = (_f = (_e = (_d = (_c = (_b = $$('script:contains("decodeURIComponent")')
                .text()
                .split(" = ")) === null || _b === void 0 ? void 0 : _b[1]) === null || _c === void 0 ? void 0 : _c.split("protomovies")) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.trim()) === null || _f === void 0 ? void 0 : _f.slice(0, -1); // remove the last character
            // console.log('protonGetInfo', htmlArray);
            const html = decodeHtml(JSON.parse(htmlArray));
            // console.log('all', html);
            const $ = cheerio.load(html);
            const title = $(".trending-text.fw-bold.texture-text.text-uppercase.my-0.fadeInLeft.animated.d-inline-block").text();
            const image = $("#thumbnail").attr("src");
            const type = link.includes("series") ? "series" : "movie";
            const synopsis = $(".col-12.iq-mb-30.animated.fadeIn").first().text() ||
                $(".description-content").text();
            const tags = $(".p-0.mt-2.list-inline.d-flex.flex-wrap.movie-tag")
                .find("li")
                .map((i, el) => $(el).text())
                .slice(0, 3)
                .get();
            const links = [];
            if (type === "movie") {
                const directLinks = [];
                directLinks.push({ title: "Movie", link: baseUrl + link });
                links.push({ title: "Movie", directLinks: directLinks });
            }
            else {
                $("#episodes")
                    .children()
                    .map((i, element) => {
                    let directLinks = [];
                    $(element)
                        .find(".episode-block")
                        .map((j, ep) => {
                        const link = baseUrl + $(ep).find("a").attr("href") || "";
                        const title = "Episode " + $(ep).find(".episode-number").text().split("E")[1];
                        directLinks.push({ title, link });
                    });
                    links.push({ title: "Season " + (i + 1), directLinks: directLinks });
                });
            }
            return {
                image: image || "",
                imdbId: "",
                linkList: links,
                title: title || "",
                synopsis: synopsis,
                tags: tags,
                type: type,
            };
        }
        catch (err) {
            console.error("prton", err);
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
