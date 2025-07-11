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
const headers = {
    "Accept-Encoding": "gzip",
    "API-KEY": "2pm95lc6prpdbk0ppji9rsqo",
    Connection: "Keep-Alive",
    "If-Modified-Since": "Wed, 14 Aug 2024 13:00:04 GMT",
    "User-Agent": "okhttp/3.14.9",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c, _d, _e;
        try {
            const { axios } = providerContext;
            const res = yield axios.get(link, { headers });
            const resData = res.data;
            const jsonStart = resData === null || resData === void 0 ? void 0 : resData.indexOf("{");
            const jsonEnd = (resData === null || resData === void 0 ? void 0 : resData.lastIndexOf("}")) + 1;
            const data = ((_b = JSON === null || JSON === void 0 ? void 0 : JSON.parse(resData === null || resData === void 0 ? void 0 : resData.substring(jsonStart, jsonEnd))) === null || _b === void 0 ? void 0 : _b.title)
                ? JSON === null || JSON === void 0 ? void 0 : JSON.parse(resData === null || resData === void 0 ? void 0 : resData.substring(jsonStart, jsonEnd))
                : resData;
            const title = (data === null || data === void 0 ? void 0 : data.title) || "";
            const synopsis = (data === null || data === void 0 ? void 0 : data.description) || "";
            const image = (data === null || data === void 0 ? void 0 : data.poster_url) || "";
            const cast = (data === null || data === void 0 ? void 0 : data.cast) || [];
            const rating = (data === null || data === void 0 ? void 0 : data.imdb_rating) || "";
            const type = Number(data === null || data === void 0 ? void 0 : data.is_tvseries) ? "series" : "movie";
            const tags = ((_c = data === null || data === void 0 ? void 0 : data.genre) === null || _c === void 0 ? void 0 : _c.map((genre) => genre === null || genre === void 0 ? void 0 : genre.name)) || [];
            const links = [];
            if (type === "series") {
                (_d = data === null || data === void 0 ? void 0 : data.season) === null || _d === void 0 ? void 0 : _d.map((season) => {
                    var _a;
                    const title = (season === null || season === void 0 ? void 0 : season.seasons_name) || "";
                    const directLinks = ((_a = season === null || season === void 0 ? void 0 : season.episodes) === null || _a === void 0 ? void 0 : _a.map((episode) => ({
                        title: episode === null || episode === void 0 ? void 0 : episode.episodes_name,
                        link: episode === null || episode === void 0 ? void 0 : episode.file_url,
                    }))) || [];
                    links.push({
                        title: title,
                        directLinks: directLinks,
                    });
                });
            }
            else {
                (_e = data === null || data === void 0 ? void 0 : data.videos) === null || _e === void 0 ? void 0 : _e.map((video) => {
                    links.push({
                        title: title + " " + (video === null || video === void 0 ? void 0 : video.label),
                        directLinks: [
                            {
                                title: "Play",
                                link: video === null || video === void 0 ? void 0 : video.file_url,
                            },
                        ],
                    });
                });
            }
            return {
                image: (image === null || image === void 0 ? void 0 : image.includes("https")) ? image : image === null || image === void 0 ? void 0 : image.replace("http", "https"),
                synopsis: synopsis,
                title: title,
                rating: rating,
                imdbId: "",
                cast: cast,
                tags: tags,
                type: type,
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
