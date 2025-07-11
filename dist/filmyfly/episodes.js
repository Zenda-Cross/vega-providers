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
            const headers = providerContext.commonHeaders;
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers });
            const data = res.data;
            const $ = cheerio.load(data);
            const episodeLinks = [];
            $(".dlink.dl").map((i, element) => {
                var _a, _b;
                const title = (_b = (_a = $(element)
                    .find("a")
                    .text()) === null || _a === void 0 ? void 0 : _a.replace("Download", "")) === null || _b === void 0 ? void 0 : _b.trim();
                const link = $(element).find("a").attr("href");
                if (title && link) {
                    episodeLinks.push({
                        title,
                        link,
                    });
                }
            });
            return episodeLinks;
        }
        catch (err) {
            console.error("cl episode links", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
