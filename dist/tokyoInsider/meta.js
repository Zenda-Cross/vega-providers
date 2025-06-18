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
exports.getMeta = void 0;
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        try {
            const { cheerio } = providerContext;
            const url = link;
            const res = yield fetch(url);
            const data = yield res.text();
            const $ = cheerio.load(data);
            const meta = {
                title: $('.c_h2:contains("Title(s):")')
                    .text()
                    .replace("Title(s):", "")
                    .trim()
                    .split("\n")[0],
                synopsis: $('.c_h2b:contains("Summary:"),.c_h2:contains("Summary:")')
                    .text()
                    .replace("Summary:", "")
                    .trim(),
                image: $(".a_img").attr("src") || "",
                imdbId: "",
                type: "series",
            };
            const episodesList = [];
            $(".episode").map((i, element) => {
                const link = "https://www.tokyoinsider.com" + $(element).find("a").attr("href") ||
                    $(".download-link").attr("href");
                let title = $(element).find("a").find("em").text() +
                    " " +
                    $(element).find("a").find("strong").text();
                if (!title.trim()) {
                    title = $(".download-link").text();
                }
                if (link && title.trim()) {
                    episodesList.push({ title, link });
                }
            });
            return Object.assign(Object.assign({}, meta), { linkList: [
                    {
                        title: meta.title,
                        directLinks: episodesList,
                    },
                ] });
        }
        catch (err) {
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "series",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
