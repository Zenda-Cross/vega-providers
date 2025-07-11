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
            const { axios, cheerio, commonHeaders: headers } = providerContext;
            const url = link;
            const res = yield axios.get(url, { headers });
            const data = res.data;
            const $ = cheerio.load(data);
            const type = url.includes("tvshows") ? "series" : "movie";
            const imdbId = "";
            const title = $('.fname:contains("Name")').find(".colora").text().trim();
            const image = $(".ss").find("img").attr("src") || "";
            const synopsis = $('.fname:contains("Description")')
                .find(".colorg")
                .text()
                .trim();
            const tags = $('.fname:contains("Genre")').find(".colorb").text().split(",") || [];
            const rating = "";
            const links = [];
            const downloadLink = $(".dlbtn").find("a").attr("href");
            if (downloadLink) {
                links.push({
                    title: title,
                    episodesLink: downloadLink,
                });
            }
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
