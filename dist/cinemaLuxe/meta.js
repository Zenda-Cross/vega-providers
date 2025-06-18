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
        try {
            const url = link;
            const res = yield providerContext.axios.get(url, {
                headers: providerContext.commonHeaders,
            });
            const data = res.data;
            const $ = providerContext.cheerio.load(data);
            const type = url.includes("tvshows") ? "series" : "movie";
            const imdbId = "";
            const title = url.split("/")[4].replace(/-/g, " ");
            const image = $(".g-item").find("a").attr("href") || "";
            const synopsis = $(".wp-content").text().trim();
            const tags = $(".sgeneros")
                .children()
                .map((i, element) => $(element).text())
                .get()
                .slice(3);
            const rating = Number($("#repimdb").find("strong").text())
                .toFixed(1)
                .toString();
            const links = [];
            $(".mb-center.maxbutton-5-center,.ep-button-container").map((i, element) => {
                var _a;
                const title = $(element)
                    .text()
                    .replace("\u2b07Download", "")
                    .replace("\u2b07 Download", "")
                    .trim();
                const link = $(element).find("a").attr("href");
                if (title && link) {
                    links.push({
                        title,
                        episodesLink: link,
                        quality: ((_a = title === null || title === void 0 ? void 0 : title.match(/\d+P\b/)) === null || _a === void 0 ? void 0 : _a[0].replace("P", "p")) || "",
                    });
                }
            });
            return {
                title,
                tags,
                rating,
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
