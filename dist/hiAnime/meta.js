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
            const { getBaseUrl, axios } = providerContext;
            const baseUrl = yield getBaseUrl("consumet");
            const url = `${baseUrl}/anime/zoro/info?id=` + link;
            const res = yield axios.get(url);
            const data = res.data;
            const meta = {
                title: data.title,
                synopsis: data.description,
                image: data.image,
                tags: [
                    data === null || data === void 0 ? void 0 : data.type,
                    (data === null || data === void 0 ? void 0 : data.subOrDub) === "both" ? "Sub And Dub" : data === null || data === void 0 ? void 0 : data.subOrDub,
                ],
                imdbId: "",
                type: data.episodes.length > 0 ? "series" : "movie",
            };
            const linkList = [];
            const subLinks = [];
            data.episodes.forEach((episode) => {
                if (!(episode === null || episode === void 0 ? void 0 : episode.isSubbed)) {
                    return;
                }
                const title = "Episode " + episode.number + ((episode === null || episode === void 0 ? void 0 : episode.isFiller) ? " (Filler)" : "");
                const link = episode.id + "$sub";
                if (link && title) {
                    subLinks.push({
                        title,
                        link,
                    });
                }
            });
            linkList.push({
                title: meta.title + " (Sub)",
                directLinks: subLinks,
            });
            if ((data === null || data === void 0 ? void 0 : data.subOrDub) === "both") {
                const dubLinks = [];
                data.episodes.forEach((episode) => {
                    if (!(episode === null || episode === void 0 ? void 0 : episode.isDubbed)) {
                        return;
                    }
                    const title = "Episode " + episode.number + ((episode === null || episode === void 0 ? void 0 : episode.isFiller) ? " (Filler)" : "");
                    const link = episode.id + "$dub";
                    if (link && title) {
                        dubLinks.push({
                            title,
                            link,
                        });
                    }
                });
                linkList.push({
                    title: meta.title + " (Dub)",
                    directLinks: dubLinks,
                });
            }
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
