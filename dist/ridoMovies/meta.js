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
        var _b, _c, _d, _e, _f, _g, _h;
        try {
            const { getBaseUrl, axios } = providerContext;
            const res = yield axios.get(link);
            const data = res.data;
            const meta = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: ((_b = data === null || data === void 0 ? void 0 : data.meta) === null || _b === void 0 ? void 0 : _b.imdb_id) || "",
                type: ((_c = data === null || data === void 0 ? void 0 : data.meta) === null || _c === void 0 ? void 0 : _c.type) || "movie",
            };
            const baseUrl = yield getBaseUrl("ridomovies");
            let slug = "";
            try {
                const res2 = yield axios.get(baseUrl + "/core/api/search?q=" + meta.imdbId);
                const data2 = res2.data;
                slug = (_e = (_d = data2 === null || data2 === void 0 ? void 0 : data2.data) === null || _d === void 0 ? void 0 : _d.items[0]) === null || _e === void 0 ? void 0 : _e.fullSlug;
                if (!slug || (meta === null || meta === void 0 ? void 0 : meta.type) === "series") {
                    return {
                        title: "",
                        synopsis: "",
                        image: "",
                        imdbId: ((_f = data === null || data === void 0 ? void 0 : data.meta) === null || _f === void 0 ? void 0 : _f.imdb_id) || "",
                        type: (meta === null || meta === void 0 ? void 0 : meta.type) || "movie",
                        linkList: [],
                    };
                }
            }
            catch (err) {
                return {
                    title: "",
                    synopsis: "",
                    image: "",
                    imdbId: (meta === null || meta === void 0 ? void 0 : meta.imdbId) || "",
                    type: (meta === null || meta === void 0 ? void 0 : meta.type) || "movie",
                    linkList: [],
                };
            }
            const links = [];
            let directLinks = [];
            let season = new Map();
            if (meta.type === "series") {
                (_h = (_g = data === null || data === void 0 ? void 0 : data.meta) === null || _g === void 0 ? void 0 : _g.videos) === null || _h === void 0 ? void 0 : _h.map((video) => {
                    if ((video === null || video === void 0 ? void 0 : video.season) <= 0)
                        return;
                    if (!season.has(video === null || video === void 0 ? void 0 : video.season)) {
                        season.set(video === null || video === void 0 ? void 0 : video.season, []);
                    }
                    season.get(video === null || video === void 0 ? void 0 : video.season).push({
                        title: "Episode " + (video === null || video === void 0 ? void 0 : video.episode),
                        link: "",
                    });
                });
                for (const [seasonNum, episodes] of season.entries()) {
                    links.push({
                        title: "Season " + seasonNum,
                        directLinks: episodes,
                    });
                }
            }
            else {
                directLinks.push({ title: "Movie", link: link });
                links.push({ title: "Movie", directLinks: directLinks });
            }
            return Object.assign(Object.assign({}, meta), { linkList: links });
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
