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
const getStream = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link: data, providerContext, }) {
    var _b, _c;
    try {
        const { cheerio, commonHeaders: headers, axios } = providerContext;
        const streamData = JSON.parse(data);
        const streamLinks = [];
        // const path =
        //   streamData?.type === 'movie'
        //     ? `/${streamData?.slug}`
        //     : `/${streamData?.slug}/season-${streamData?.season}/episode-${streamData?.episode}`;
        // const url = streamData?.baseUrl + path;
        // console.log('all', url);
        // const res = await axios.get(url, {headers});
        // const postId = res.data.split('\\"postid\\":\\"')[1].split('\\"')[0];
        // console.log('rido post id', postId);
        const url = (streamData === null || streamData === void 0 ? void 0 : streamData.baseUrl) + "/api/" + (streamData === null || streamData === void 0 ? void 0 : streamData.slug);
        console.log("rido url", url);
        const res = yield axios.get(url, { headers });
        const iframe = (_c = (_b = res.data.data) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.url;
        console.log("rido data", iframe);
        const iframeUrl = iframe.split('src="')[1].split('"')[0];
        console.log("rido iframeUrl", iframeUrl);
        const iframeRes = yield axios.get(iframeUrl, {
            headers: Object.assign(Object.assign({}, headers), { Referer: streamData === null || streamData === void 0 ? void 0 : streamData.baseUrl }),
        });
        const $ = cheerio.load(iframeRes.data);
        const script = $('script:contains("eval")').html();
        if (!script) {
            throw new Error("Unable to find script");
        }
        // console.log('rido script', script);
        const srcUrl = unpackJavaScript(script.trim());
        console.log("rido srcUrl", srcUrl);
        streamLinks.push({
            link: srcUrl,
            server: "rido",
            type: "m3u8",
            headers: {
                Referer: iframeUrl,
            },
        });
        return streamLinks;
    }
    catch (e) {
        console.log("rido get stream err", e);
        return [];
    }
});
exports.getStream = getStream;
function unpackJavaScript(packedCode) {
    const encodedString = packedCode.split("|aHR")[1].split("|")[0];
    const base64Url = "aHR" + encodedString;
    function addPadding(base64) {
        return base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    }
    console.log("rido base64Url", base64Url);
    const unpackedCode = atob(addPadding(base64Url));
    return unpackedCode;
}
