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
    return __awaiter(this, arguments, void 0, function* ({ link: id, 
    // type,
    signal, providerContext, }) {
        try {
            const { axios, cheerio } = providerContext;
            const stream = [];
            const [, epId] = id.split("&");
            const url = `https://febbox.vercel.app/api/video-quality?fid=${epId}`;
            const res = yield axios.get(url, { signal });
            const data = res.data;
            const $ = cheerio.load(data.html);
            $(".file_quality").each((i, el) => {
                const server = $(el).find("p.name").text() +
                    " - " +
                    $(el).find("p.size").text() +
                    " - " +
                    $(el).find("p.speed").text();
                const link = $(el).attr("data-url");
                if (link) {
                    stream.push({
                        server: server,
                        type: "mkv",
                        link: link,
                    });
                }
            });
            return stream;
        }
        catch (err) {
            return [];
        }
    });
};
exports.getStream = getStream;
