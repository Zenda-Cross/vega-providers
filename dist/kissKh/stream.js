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
        var _b, _c, _d;
        try {
            const { axios, getBaseUrl } = providerContext;
            const streamLinks = [];
            const subtitles = [];
            const baseUrl = yield getBaseUrl("kissKh");
            const streamUrl = "https://adorable-salamander-ecbb21.netlify.app/api/kisskh/video?id=" +
                id;
            const res = yield axios.get(streamUrl);
            const stream = (_c = (_b = res.data) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.Video;
            const subData = (_d = res.data) === null || _d === void 0 ? void 0 : _d.subtitles;
            subData === null || subData === void 0 ? void 0 : subData.map((sub) => {
                var _a;
                subtitles.push({
                    title: sub === null || sub === void 0 ? void 0 : sub.label,
                    language: sub === null || sub === void 0 ? void 0 : sub.land,
                    type: ((_a = sub === null || sub === void 0 ? void 0 : sub.src) === null || _a === void 0 ? void 0 : _a.includes(".vtt")) ? "text/vtt" : "application/x-subrip",
                    uri: sub === null || sub === void 0 ? void 0 : sub.src,
                });
            });
            streamLinks.push({
                server: "kissKh",
                link: stream,
                type: "m3u8",
                subtitles,
                headers: {
                    referer: baseUrl,
                },
            });
            return streamLinks;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getStream = getStream;
