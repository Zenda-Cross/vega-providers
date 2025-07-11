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
exports.getEpisodes = void 0;
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url: link, providerContext, }) {
        var _b;
        const { getBaseUrl, axios } = providerContext;
        let providerValue = "netflixMirror";
        try {
            const baseUrl = yield getBaseUrl("nfMirror");
            const url = `${baseUrl}${"/pv/episodes.php?s="}` +
                link +
                "&t=" +
                Math.round(new Date().getTime() / 1000);
            console.log("nfEpisodesUrl", url);
            let page = 1;
            let hasMorePages = true;
            const episodeList = [];
            while (hasMorePages) {
                const res = yield axios.get(url + `&page=${page}`, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                });
                const data = res.data;
                (_b = data === null || data === void 0 ? void 0 : data.episodes) === null || _b === void 0 ? void 0 : _b.map((episode) => {
                    episodeList.push({
                        title: "Episode " + (episode === null || episode === void 0 ? void 0 : episode.ep.replace("E", "")),
                        link: episode === null || episode === void 0 ? void 0 : episode.id,
                    });
                });
                if (data === null || data === void 0 ? void 0 : data.nextPageShow) {
                    page++;
                }
                else {
                    hasMorePages = false;
                }
            }
            return episodeList.sort((a, b) => {
                const aNum = parseInt(a.title.replace("Episode ", ""));
                const bNum = parseInt(b.title.replace("Episode ", ""));
                return aNum - bNum;
            });
        }
        catch (err) {
            console.error("nfGetEpisodes error", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
