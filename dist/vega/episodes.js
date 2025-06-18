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
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        const { axios, cheerio, commonHeaders: headers } = providerContext;
        console.log("getEpisodeLinks", url);
        try {
            const res = yield axios.get(url, { headers });
            const $ = cheerio.load(res.data);
            const container = $(".entry-content,.entry-inner");
            $(".unili-content,.code-block-1").remove();
            const episodes = [];
            container.find("h4").each((index, element) => {
                const el = $(element);
                const title = el.text().replace(/-/g, "").replace(/:/g, "");
                const link = el
                    .next("p")
                    .find('.btn-outline[style="background:linear-gradient(135deg,#ed0b0b,#f2d152); color: white;"]')
                    .parent()
                    .attr("href");
                if (title && link) {
                    episodes.push({ title, link });
                }
            });
            // console.log(episodes);
            return episodes;
        }
        catch (err) {
            console.log("getEpisodeLinks error: ");
            // console.error(err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
