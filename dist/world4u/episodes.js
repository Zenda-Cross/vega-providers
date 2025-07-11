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
        const { axios, cheerio } = providerContext;
        try {
            const res = yield axios.get(url);
            const html = res.data;
            let $ = cheerio.load(html);
            const episodeLinks = [];
            $('strong:contains("Episode"),strong:contains("1080"),strong:contains("720"),strong:contains("480")').map((i, element) => {
                const title = $(element).text();
                const link = $(element)
                    .parent()
                    .parent()
                    .next("h4")
                    .find("a")
                    .attr("href");
                if (link && !title.includes("zip")) {
                    episodeLinks.push({
                        title: title,
                        link,
                    });
                }
            });
            return episodeLinks;
        }
        catch (err) {
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
