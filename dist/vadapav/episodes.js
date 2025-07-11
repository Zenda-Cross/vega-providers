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
            const baseUrl = url === null || url === void 0 ? void 0 : url.split("/").slice(0, 3).join("/");
            const res = yield axios.get(url);
            const html = res.data;
            let $ = cheerio.load(html);
            const episodeLinks = [];
            $('.file-entry:not(:contains("Parent Directory"))').map((i, element) => {
                var _a, _b, _c, _d, _e, _f;
                const link = $(element).attr("href");
                if (link &&
                    (((_a = $(element).text()) === null || _a === void 0 ? void 0 : _a.includes(".mp4")) ||
                        ((_b = $(element).text()) === null || _b === void 0 ? void 0 : _b.includes(".mkv")))) {
                    episodeLinks.push({
                        title: ((_e = (_d = (_c = $(element).text()) === null || _c === void 0 ? void 0 : _c.match(/E\d+/)) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.replace("E", "Episode ")) ||
                            i + 1 + ". " + ((_f = $(element).text()) === null || _f === void 0 ? void 0 : _f.replace(".mkv", "")),
                        link: baseUrl + link,
                    });
                }
            });
            return episodeLinks;
        }
        catch (err) {
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
