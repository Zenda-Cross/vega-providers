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
            const { axios, cheerio } = providerContext;
            const url = link;
            const res = yield axios.get(url);
            const data = res.data;
            const $ = cheerio.load(data);
            const type = url.includes("tvshows") ? "series" : "movie";
            const imdbId = "";
            const title = url.split("/")[4].replace(/-/g, " ");
            const image = $(".g-item").find("a").attr("href") || "";
            const synopsis = $(".wp-content").find("p").text() || "";
            // Links
            const links = [];
            if (type === "series") {
                $("#seasons")
                    .children()
                    .map((i, element) => {
                    const title = $(element)
                        .find(".title")
                        .children()
                        .remove()
                        .end()
                        .text();
                    let episodesList = [];
                    $(element)
                        .find(".episodios")
                        .children()
                        .map((i, element) => {
                        const title = "Episode" +
                            $(element).find(".numerando").text().trim().split("-")[1];
                        const link = $(element).find("a").attr("href");
                        if (title && link) {
                            episodesList.push({ title, link });
                        }
                    });
                    if (title && episodesList.length > 0) {
                        links.push({
                            title,
                            directLinks: episodesList,
                        });
                    }
                });
            }
            else {
                links.push({
                    title: title,
                    directLinks: [{ title: title, link: url.slice(0, -1), type: "movie" }],
                });
            }
            // console.log('multi meta', links);
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
