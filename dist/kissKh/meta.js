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
            const { axios } = providerContext;
            const res = yield axios.get(link);
            const data = res.data;
            const meta = {
                title: data.title,
                synopsis: data.description,
                image: data.thumbnail,
                tags: [(_b = data === null || data === void 0 ? void 0 : data.releaseDate) === null || _b === void 0 ? void 0 : _b.split("-")[0], data === null || data === void 0 ? void 0 : data.status, data === null || data === void 0 ? void 0 : data.type],
                imdbId: "",
                type: data.episodesCount > 1 ? "series" : "movie",
            };
            const linkList = [];
            const subLinks = [];
            (_c = data === null || data === void 0 ? void 0 : data.episodes) === null || _c === void 0 ? void 0 : _c.reverse().map((episode) => {
                var _a;
                const title = "Episode " + (episode === null || episode === void 0 ? void 0 : episode.number);
                const link = (_a = episode === null || episode === void 0 ? void 0 : episode.id) === null || _a === void 0 ? void 0 : _a.toString();
                if (link && title) {
                    subLinks.push({
                        title,
                        link,
                    });
                }
            });
            linkList.push({
                title: meta.title,
                directLinks: subLinks,
            });
            return Object.assign(Object.assign({}, meta), { linkList: linkList });
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
