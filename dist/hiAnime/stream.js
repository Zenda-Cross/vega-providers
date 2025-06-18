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
exports.getStream = void 0;
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: id, providerContext, }) {
        try {
            const { getBaseUrl, axios } = providerContext;
            const baseUrl = yield getBaseUrl("consumet");
            const servers = ["vidcloud", "vidstreaming"];
            const url = `${baseUrl}/anime/zoro/watch?episodeId=${id}&server=`;
            const streamLinks = [];
            yield Promise.all(servers.map((server) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                try {
                    const res = yield axios.get(url + server);
                    if (res.data) {
                        const subtitles = [];
                        (_a = res.data) === null || _a === void 0 ? void 0 : _a.subtitles.forEach((sub) => {
                            var _a, _b;
                            if ((sub === null || sub === void 0 ? void 0 : sub.lang) === "Thumbnails")
                                return;
                            subtitles.push({
                                language: ((_a = sub === null || sub === void 0 ? void 0 : sub.lang) === null || _a === void 0 ? void 0 : _a.slice(0, 2)) || "Und",
                                uri: sub === null || sub === void 0 ? void 0 : sub.url,
                                title: (sub === null || sub === void 0 ? void 0 : sub.lang) || "Undefined",
                                type: ((_b = sub === null || sub === void 0 ? void 0 : sub.url) === null || _b === void 0 ? void 0 : _b.endsWith(".vtt"))
                                    ? "text/vtt"
                                    : "application/x-subrip",
                            });
                        });
                        (_b = res.data) === null || _b === void 0 ? void 0 : _b.sources.forEach((source) => {
                            streamLinks.push({
                                server: server,
                                link: source === null || source === void 0 ? void 0 : source.url,
                                type: (source === null || source === void 0 ? void 0 : source.isM3U8) ? "m3u8" : "mp4",
                                headers: {
                                    Referer: "https://megacloud.club/",
                                    Origin: "https://megacloud.club",
                                },
                                subtitles: subtitles,
                            });
                        });
                    }
                }
                catch (e) {
                    console.log(e);
                }
            })));
            return streamLinks;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getStream = getStream;
