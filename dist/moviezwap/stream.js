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
exports.getStream = getStream;
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, signal, providerContext, }) {
        const { axios, cheerio, commonHeaders: headers } = providerContext;
        const res = yield axios.get(link, { headers, signal });
        const html = res.data;
        const $ = cheerio.load(html);
        const Streams = [];
        // Find the actual .mp4 download link
        let downloadLink = null;
        $('a:contains("Fast Download Server")').each((i, el) => {
            const href = $(el).attr("href");
            if (href && href.toLocaleLowerCase().includes(".mp4")) {
                Streams.push({
                    link: href,
                    type: "mp4",
                    server: "Fast Download",
                    headers: headers,
                });
            }
        });
        return Streams;
    });
}
