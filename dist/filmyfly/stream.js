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
    return __awaiter(this, arguments, void 0, function* ({ link, signal, providerContext, }) {
        try {
            const res = yield providerContext.axios.get(link, { signal });
            const data = res.data;
            const $ = providerContext.cheerio.load(data);
            const streams = [];
            const elements = $(".button2,.button1,.button3,.button4,.button").toArray();
            const promises = elements.map((element) => __awaiter(this, void 0, void 0, function* () {
                const title = $(element).text();
                let link = $(element).attr("href");
                if (title.includes("GDFLIX") && link) {
                    const gdLinks = yield providerContext.extractors.gdFlixExtracter(link, signal);
                    streams.push(...gdLinks);
                }
                const alreadyAdded = streams.find((s) => s.link === link);
                if (title &&
                    link &&
                    !title.includes("Watch") &&
                    !title.includes("Login") &&
                    !title.includes("GoFile") &&
                    !alreadyAdded) {
                    streams.push({
                        server: title,
                        link: link,
                        type: "mkv",
                    });
                }
            }));
            yield Promise.all(promises);
            return streams;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getStream = getStream;
