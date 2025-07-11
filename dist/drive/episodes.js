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
        try {
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url);
            const html = res.data;
            let $ = cheerio.load(html);
            const episodeLinks = [];
            $('a:contains("HubCloud")').map((i, element) => {
                const title = $(element).parent().prev().text();
                const link = $(element).attr("href");
                if (link && (title.includes("Ep") || title.includes("Download"))) {
                    episodeLinks.push({
                        title: title.includes("Download") ? "Play" : title,
                        link,
                    });
                }
            });
            // console.log(episodeLinks);
            return episodeLinks;
        }
        catch (err) {
            console.error(err);
            return [
                {
                    title: "Server 1",
                    link: url,
                },
            ];
        }
    });
};
exports.getEpisodes = getEpisodes;
