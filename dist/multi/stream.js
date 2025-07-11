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
    return __awaiter(this, arguments, void 0, function* ({ link: url, providerContext, }) {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { axios, cheerio } = providerContext;
        const headers = {
            "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            Referer: "https://multimovies.online/",
            "Sec-Fetch-User": "?1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        };
        try {
            const res = yield axios.get(url, { headers });
            const html = res.data;
            const $ = cheerio.load(html);
            const streamLinks = [];
            const postId = $("#player-option-1").attr("data-post");
            const nume = $("#player-option-1").attr("data-nume");
            const typeValue = $("#player-option-1").attr("data-type");
            const baseUrl = url.split("/").slice(0, 3).join("/");
            console.log("baseUrl", baseUrl);
            const formData = new FormData();
            formData.append("action", "doo_player_ajax");
            formData.append("post", postId || "");
            formData.append("nume", nume || "");
            formData.append("type", typeValue || "");
            console.log("formData", formData);
            const playerRes = yield fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
                headers: headers,
                body: formData,
                method: "POST",
            });
            const playerData = yield playerRes.json();
            console.log("playerData", playerData);
            let ifameUrl = ((_c = (_b = playerData === null || playerData === void 0 ? void 0 : playerData.embed_url) === null || _b === void 0 ? void 0 : _b.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)) === null || _c === void 0 ? void 0 : _c[1]) ||
                (playerData === null || playerData === void 0 ? void 0 : playerData.embed_url);
            console.log("ifameUrl", ifameUrl);
            if (!ifameUrl.includes("multimovies")) {
                let playerBaseUrl = ifameUrl.split("/").slice(0, 3).join("/");
                const newPlayerBaseUrl = yield axios.head(playerBaseUrl, { headers });
                if (newPlayerBaseUrl) {
                    playerBaseUrl = (_e = (_d = newPlayerBaseUrl.request) === null || _d === void 0 ? void 0 : _d.responseURL) === null || _e === void 0 ? void 0 : _e.split("/").slice(0, 3).join("/");
                }
                const playerId = ifameUrl.split("/").pop();
                const NewformData = new FormData();
                NewformData.append("sid", playerId);
                console.log("NewformData", playerBaseUrl + "/embedhelper.php", NewformData);
                const playerRes = yield fetch(`${playerBaseUrl}/embedhelper.php`, {
                    headers: headers,
                    body: NewformData,
                    method: "POST",
                });
                const playerData = yield playerRes.json();
                // console.log('playerData', playerData);
                const siteUrl = (_f = playerData === null || playerData === void 0 ? void 0 : playerData.siteUrls) === null || _f === void 0 ? void 0 : _f.smwh;
                const siteId = ((_g = JSON.parse(atob(playerData === null || playerData === void 0 ? void 0 : playerData.mresult))) === null || _g === void 0 ? void 0 : _g.smwh) ||
                    ((_h = playerData === null || playerData === void 0 ? void 0 : playerData.mresult) === null || _h === void 0 ? void 0 : _h.smwh);
                const newIframeUrl = siteUrl + siteId;
                console.log("newIframeUrl", newIframeUrl);
                if (newIframeUrl) {
                    ifameUrl = newIframeUrl;
                }
            }
            const iframeRes = yield axios.get(ifameUrl, {
                headers: Object.assign(Object.assign({}, headers), { Referer: url }),
            });
            const iframeData = iframeRes.data;
            // Step 1: Extract the function parameters and the encoded string
            var functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
            var match = functionRegex.exec(iframeData);
            let p = "";
            if (match) {
                // var params = match[1].split(',').map(param => param.trim());
                var encodedString = match[2];
                // console.log('Parameters:', params);
                // console.log('Encoded String:', encodedString.split("',36,")[0], '🔥🔥');
                p = (_j = encodedString.split("',36,")) === null || _j === void 0 ? void 0 : _j[0].trim();
                let a = 36;
                let c = encodedString.split("',36,")[1].slice(2).split("|").length;
                let k = encodedString.split("',36,")[1].slice(2).split("|");
                while (c--) {
                    if (k[c]) {
                        var regex = new RegExp("\\b" + c.toString(a) + "\\b", "g");
                        p = p.replace(regex, k[c]);
                    }
                }
                // console.log('Decoded String:', p);
            }
            else {
                console.log("No match found");
            }
            const streamUrl = (_k = p === null || p === void 0 ? void 0 : p.match(/https?:\/\/[^"]+?\.m3u8[^"]*/)) === null || _k === void 0 ? void 0 : _k[0];
            const subtitles = [];
            const subtitleMatch = p === null || p === void 0 ? void 0 : p.match(/https:\/\/[^\s"]+\.vtt/g);
            // console.log('subtitleMatch', subtitleMatch);
            // console.log('streamUrl', streamUrl);
            if (subtitleMatch === null || subtitleMatch === void 0 ? void 0 : subtitleMatch.length) {
                subtitleMatch.forEach((sub) => {
                    const lang = sub.match(/_([a-zA-Z]{3})\.vtt$/)[1];
                    subtitles.push({
                        language: lang,
                        uri: sub,
                        type: "text/vtt",
                        title: lang,
                    });
                });
            }
            console.log("streamUrl", streamUrl);
            console.log("newUrl", streamUrl === null || streamUrl === void 0 ? void 0 : streamUrl.replace(/&i=\d+,'\.4&/, "&i=0.4&"));
            if (streamUrl) {
                streamLinks.push({
                    server: "Multi",
                    link: streamUrl.replace(/&i=\d+,'\.4&/, "&i=0.4&"),
                    type: "m3u8",
                    subtitles: subtitles,
                });
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
