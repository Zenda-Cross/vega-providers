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
const getStream = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link: id, providerContext, }) {
    const { getBaseUrl } = providerContext;
    try {
        let providerValue = "primeMirror";
        const baseUrl = yield getBaseUrl("nfMirror");
        const url = `https://netmirror.8man.me/api/net-proxy?url=${baseUrl}${providerValue === "netflixMirror"
            ? "/mobile/playlist.php?id="
            : "/pv/playlist.php?id="}${id}&t=${Math.round(new Date().getTime() / 1000)}`;
        console.log("nfGetStream, url:", url);
        const res = yield fetch(url, {
            credentials: "omit",
        });
        const resJson = yield res.json();
        const data = resJson === null || resJson === void 0 ? void 0 : resJson[0];
        const streamLinks = [];
        data === null || data === void 0 ? void 0 : data.sources.forEach((source) => {
            var _a;
            streamLinks.push({
                server: source.label,
                link: (_a = (baseUrl + source.file)) === null || _a === void 0 ? void 0 : _a.replace(":su", ":ni"),
                type: "m3u8",
                headers: {
                    Referer: baseUrl,
                    origin: baseUrl,
                    Cookie: "hd=on",
                },
            });
        });
        console.log(streamLinks);
        return streamLinks;
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getStream = getStream;
