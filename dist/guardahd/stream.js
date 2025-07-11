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
    return __awaiter(this, arguments, void 0, function* ({ link: id, type, providerContext, }) {
        try {
            const { axios, cheerio, extractors } = providerContext;
            const { superVideoExtractor } = extractors;
            function ExtractGuardahd(_a) {
                return __awaiter(this, arguments, void 0, function* ({ imdb, // type, // season,
                 }) {
                    try {
                        const baseUrl = "https://guardahd.stream";
                        const path = "/set-movie-a/" + imdb;
                        const url = baseUrl + path;
                        console.log("url:", url);
                        const res = yield axios.get(url, { timeout: 4000 });
                        const html = res.data;
                        const $ = cheerio.load(html);
                        const superVideoUrl = $('li:contains("supervideo")').attr("data-link");
                        console.log("superVideoUrl:", superVideoUrl);
                        if (!superVideoUrl) {
                            return null;
                        }
                        const controller2 = new AbortController();
                        const signal2 = controller2.signal;
                        setTimeout(() => controller2.abort(), 4000);
                        const res2 = yield fetch("https:" + superVideoUrl, { signal: signal2 });
                        const data = yield res2.text();
                        //   console.log('mostraguarda data:', data);
                        const streamUrl = yield superVideoExtractor(data);
                        return streamUrl;
                    }
                    catch (err) {
                        console.error("Error in GetMostraguardaStram:", err);
                    }
                });
            }
            function GetMostraguardaStream(_a) {
                return __awaiter(this, arguments, void 0, function* ({ imdb, type, season, episode, }) {
                    try {
                        const baseUrl = "https://mostraguarda.stream";
                        const path = type === "tv"
                            ? `/serie/${imdb}/${season}/${episode}`
                            : `/movie/${imdb}`;
                        const url = baseUrl + path;
                        console.log("url:", url);
                        const res = yield axios(url, { timeout: 4000 });
                        const html = res.data;
                        const $ = cheerio.load(html);
                        const superVideoUrl = $('li:contains("supervideo")').attr("data-link");
                        console.log("superVideoUrl:", superVideoUrl);
                        if (!superVideoUrl) {
                            return null;
                        }
                        const controller2 = new AbortController();
                        const signal2 = controller2.signal;
                        setTimeout(() => controller2.abort(), 4000);
                        const res2 = yield fetch("https:" + superVideoUrl, { signal: signal2 });
                        const data = yield res2.text();
                        //   console.log('mostraguarda data:', data);
                        const streamUrl = yield superVideoExtractor(data);
                        return streamUrl;
                    }
                    catch (err) {
                        console.error("Error in GetMostraguardaStram:", err);
                    }
                });
            }
            console.log(id);
            const streams = [];
            const { imdbId, season, episode } = JSON.parse(id);
            ///// mostraguarda
            const mostraguardaStream = yield GetMostraguardaStream({
                imdb: imdbId,
                type: type,
                season: season,
                episode: episode,
            });
            if (mostraguardaStream) {
                streams.push({
                    server: "Supervideo 1",
                    link: mostraguardaStream,
                    type: "m3u8",
                });
            }
            const guardahdStream = yield ExtractGuardahd({
                imdb: imdbId,
                type: type,
                season: season,
                episode: episode,
            });
            if (guardahdStream) {
                streams.push({
                    server: "Supervideo 2",
                    link: guardahdStream,
                    type: "m3u8",
                });
            }
            return streams;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getStream = getStream;
