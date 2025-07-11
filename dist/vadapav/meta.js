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
        var _b, _c;
        try {
            const { axios, cheerio } = providerContext;
            const baseUrl = link === null || link === void 0 ? void 0 : link.split("/").slice(0, 3).join("/");
            const url = link;
            const res = yield axios.get(url);
            const data = res.data;
            const $ = cheerio.load(data);
            const title = ((_c = (_b = $(".directory")
                .children()
                .first()
                .text()
                .trim()) === null || _b === void 0 ? void 0 : _b.split("/").pop()) === null || _c === void 0 ? void 0 : _c.trim()) || "";
            const links = [];
            $('.directory-entry:not(:contains("Parent Directory"))').map((i, element) => {
                const link = $(element).attr("href");
                if (link) {
                    links.push({
                        episodesLink: baseUrl + link,
                        title: $(element).text(),
                    });
                }
            });
            const directLinks = [];
            $('.file-entry:not(:contains("Parent Directory"))').map((i, element) => {
                var _a, _b;
                const link = $(element).attr("href");
                if (link &&
                    (((_a = $(element).text()) === null || _a === void 0 ? void 0 : _a.includes(".mp4")) ||
                        ((_b = $(element).text()) === null || _b === void 0 ? void 0 : _b.includes(".mkv")))) {
                    directLinks.push({
                        title: i + 1 + ". " + $(element).text(),
                        link: baseUrl + link,
                    });
                }
            });
            if (directLinks.length > 0) {
                links.push({
                    title: title + " DL",
                    directLinks: directLinks,
                });
            }
            return {
                title: title,
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
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
