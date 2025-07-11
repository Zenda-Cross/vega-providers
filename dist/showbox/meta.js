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
        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
        try {
            const { axios, cheerio, getBaseUrl } = providerContext;
            const baseUrlShowbox = yield getBaseUrl("showbox");
            const url = baseUrlShowbox + link;
            const res = yield axios.get(url);
            const data = res.data;
            const $ = cheerio.load(data);
            const type = url.includes("tv") ? "series" : "movie";
            const imdbId = "";
            const title = $(".heading-name").text();
            const rating = ((_c = (_b = $(".btn-imdb")
                .text()) === null || _b === void 0 ? void 0 : _b.match(/\d+(\.\d+)?/g)) === null || _c === void 0 ? void 0 : _c[0]) || "";
            const image = ((_e = (_d = $(".cover_follow").attr("style")) === null || _d === void 0 ? void 0 : _d.split("url(")[1]) === null || _e === void 0 ? void 0 : _e.split(")")[0]) || "";
            const synopsis = (_g = (_f = $(".description")
                .text()) === null || _f === void 0 ? void 0 : _f.replace(/[\n\t]/g, "")) === null || _g === void 0 ? void 0 : _g.trim();
            const febID = (_j = (_h = $(".heading-name").find("a").attr("href")) === null || _h === void 0 ? void 0 : _h.split("/")) === null || _j === void 0 ? void 0 : _j.pop();
            const baseUrl = url.split("/").slice(0, 3).join("/");
            const indexUrl = `${baseUrl}/index/share_link?id=${febID}&type=${type === "movie" ? "1" : "2"}`;
            const indexRes = yield axios.get(indexUrl);
            const indexData = indexRes.data;
            const febKey = indexData.data.link.split("/").pop();
            const febLink = `https://www.febbox.com/file/file_share_list?share_key=${febKey}&is_html=0`;
            const febRes = yield axios.get(febLink);
            const febData = febRes.data;
            const fileList = (_k = febData === null || febData === void 0 ? void 0 : febData.data) === null || _k === void 0 ? void 0 : _k.file_list;
            const links = [];
            if (fileList) {
                fileList.map((file) => {
                    const fileName = `${file.file_name} (${file.file_size})`;
                    const fileId = file.fid;
                    links.push({
                        title: fileName,
                        episodesLink: file.is_dir ? `${febKey}&${fileId}` : `${febKey}&`,
                    });
                });
            }
            return {
                title,
                rating,
                synopsis,
                image,
                imdbId,
                type,
                linkList: links,
            };
        }
        catch (err) {
            console.error("Error fetching metadata:", err);
            return {
                title: "",
                rating: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
