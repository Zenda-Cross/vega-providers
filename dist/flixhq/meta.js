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
    return __awaiter(this, arguments, void 0, function* ({ link: id, providerContext, }) {
        try {
            const { axios, getBaseUrl } = providerContext;
            const baseUrl = yield getBaseUrl("consumet");
            const url = `${baseUrl}/movies/flixhq/info?id=` + id;
            const res = yield axios.get(url);
            const data = res.data;
            const meta = {
                title: data.title,
                synopsis: data.description.replace(/<[^>]*>?/gm, "").trim(),
                image: data.cover,
                cast: data.casts,
                rating: data.rating,
                tags: [data === null || data === void 0 ? void 0 : data.type, data === null || data === void 0 ? void 0 : data.duration, data.releaseDate.split("-")[0]],
                imdbId: "",
                type: data.episodes.length > 1 ? "series" : "movie",
            };
            const links = [];
            data.episodes.forEach((episode) => {
                const title = (episode === null || episode === void 0 ? void 0 : episode.number)
                    ? "Season-" + (episode === null || episode === void 0 ? void 0 : episode.season) + " Ep-" + episode.number
                    : episode.title;
                const link = episode.id + "*" + data.id;
                if (link && title) {
                    links.push({
                        title,
                        link,
                    });
                }
            });
            return Object.assign(Object.assign({}, meta), { linkList: [
                    {
                        title: meta.title,
                        directLinks: links,
                    },
                ] });
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
