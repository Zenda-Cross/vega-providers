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
        var _b;
        try {
            const { getBaseUrl } = providerContext;
            const episodeId = id.split("*")[0];
            const mediaId = id.split("*")[1];
            const baseUrl = yield getBaseUrl("consumet");
            const serverUrl = `${baseUrl}/movies/flixhq/servers?episodeId=${episodeId}&mediaId=${mediaId}`;
            const res = yield fetch(serverUrl);
            const servers = yield res.json();
            const streamLinks = [];
            for (const server of servers) {
                const streamUrl = `${baseUrl}/movies/flixhq/watch?server=` +
                    server.name +
                    "&episodeId=" +
                    episodeId +
                    "&mediaId=" +
                    mediaId;
                const streamRes = yield fetch(streamUrl);
                const streamData = yield streamRes.json();
                const subtitles = [];
                if (((_b = streamData === null || streamData === void 0 ? void 0 : streamData.sources) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    if (streamData.subtitles) {
                        streamData.subtitles.forEach((sub) => {
                            var _a;
                            subtitles.push({
                                language: (_a = sub === null || sub === void 0 ? void 0 : sub.lang) === null || _a === void 0 ? void 0 : _a.slice(0, 2),
                                uri: sub === null || sub === void 0 ? void 0 : sub.url,
                                type: "text/vtt",
                                title: sub === null || sub === void 0 ? void 0 : sub.lang,
                            });
                        });
                    }
                    streamData.sources.forEach((source) => {
                        var _a;
                        streamLinks.push({
                            server: (server === null || server === void 0 ? void 0 : server.name) +
                                "-" +
                                ((_a = source === null || source === void 0 ? void 0 : source.quality) === null || _a === void 0 ? void 0 : _a.replace("auto", "MultiQuality")),
                            link: source.url,
                            type: source.isM3U8 ? "m3u8" : "mp4",
                            subtitles: subtitles,
                        });
                    });
                }
            }
            return streamLinks;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getStream = getStream;
