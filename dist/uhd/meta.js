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
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b;
        try {
            const { axios, cheerio } = providerContext;
            console.log("Fetching metadata from UHD...", link, providerContext);
            const url = link;
            const res = yield axios.get(url, { headers });
            const html = yield res.data;
            const $ = cheerio.load(html);
            const title = $("h2:first").text() || "";
            const image = $("h2").siblings().find("img").attr("src") || "";
            // const trailer = $('iframe').attr('src') || '';
            // console.log({ title, image, trailer });
            // Links
            const episodes = [];
            // new structure
            $(".mks_separator,p:contains('mks_separator')").each((index, element) => {
                $(element)
                    .nextUntil(".mks_separator")
                    .each((index, element) => {
                    const title = $(element).text();
                    const episodesList = [];
                    $(element)
                        .next("p")
                        .find("a")
                        .each((index, element) => {
                        const title = $(element).text();
                        const link = $(element).attr("href");
                        if (title && link && !title.toLocaleLowerCase().includes("zip")) {
                            episodesList.push({ title, link });
                            //   console.log({ title, link });
                        }
                    });
                    if (title && episodesList.length > 0) {
                        episodes.push({
                            title,
                            directLinks: episodesList,
                        });
                    }
                });
            });
            // old structure
            $("hr").each((index, element) => {
                $(element)
                    .nextUntil("hr")
                    .each((index, element) => {
                    const title = $(element).text();
                    const episodesList = [];
                    $(element)
                        .next("p")
                        .find("a")
                        .each((index, element) => {
                        const title = $(element).text();
                        const link = $(element).attr("href");
                        if (title && link && !title.toLocaleLowerCase().includes("zip")) {
                            episodesList.push({ title, link });
                            //   console.log({ title, link });
                        }
                    });
                    if (title && episodesList.length > 0) {
                        episodes.push({
                            title,
                            directLinks: episodesList,
                        });
                    }
                });
            });
            // console.log(episodes);
            return {
                title: title.match(/^Download\s+([^(\[]+)/i)
                    ? ((_b = title === null || title === void 0 ? void 0 : title.match(/^Download\s+([^(\[]+)/i)) === null || _b === void 0 ? void 0 : _b[1]) || ""
                    : title.replace("Download", "") || "",
                image,
                imdbId: "",
                synopsis: title,
                type: "",
                linkList: episodes,
            };
        }
        catch (error) {
            console.error(error);
            return {
                title: "",
                image: "",
                imdbId: "",
                synopsis: "",
                linkList: [],
                type: "uhd",
            };
        }
    });
};
exports.getMeta = getMeta;
