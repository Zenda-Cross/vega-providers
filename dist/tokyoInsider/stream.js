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
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        try {
            const { cheerio } = providerContext;
            const url = link;
            const res = yield fetch(url);
            const data = yield res.text();
            const $ = cheerio.load(data);
            const streamLinks = [];
            $(".c_h1,.c_h2").map((i, element) => {
                $(element).find("span").remove();
                const title = $(element).find("a").text() || "";
                const link = $(element).find("a").attr("href") || "";
                if (title && link.includes("media")) {
                    streamLinks.push({
                        server: title,
                        link,
                        type: link.split(".").pop() || "mkv",
                    });
                }
            });
            return streamLinks;
        }
        catch (err) {
            return [];
        }
    });
};
exports.getStream = getStream;
