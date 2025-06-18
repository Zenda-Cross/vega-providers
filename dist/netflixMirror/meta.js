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
    return __awaiter(this, arguments, void 0, function* ({ link, }) {
        var _b, _c, _d, _e;
        let providerValue = "netflixMirror";
        try {
            const isPrime = providerValue === "primeMirror" ? "isPrime=true" : "isPrime=false";
            const url = `https://netmirror.8man.me/api/net-proxy?${isPrime}&url=${encodeURIComponent(link)}`;
            console.log("nfifo", url);
            const res = yield fetch(url, {
                credentials: "omit",
            });
            const data = yield res.json();
            const id = (_b = link.split("id=")[1]) === null || _b === void 0 ? void 0 : _b.split("&")[0];
            const meta = {
                title: data.title,
                synopsis: data.desc,
                image: `https://img.nfmirrorcdn.top/poster/h/${id}.jpg`,
                cast: (_c = data === null || data === void 0 ? void 0 : data.short_cast) === null || _c === void 0 ? void 0 : _c.split(","),
                tags: [data === null || data === void 0 ? void 0 : data.year, data === null || data === void 0 ? void 0 : data.hdsd, ...(_d = data === null || data === void 0 ? void 0 : data.thismovieis) === null || _d === void 0 ? void 0 : _d.split(",")],
                imdbId: "",
                type: "series",
            };
            console.log("nfinfo", meta);
            const linkList = [];
            if (((_e = data === null || data === void 0 ? void 0 : data.season) === null || _e === void 0 ? void 0 : _e.length) > 0) {
                data.season.map((season) => {
                    linkList.push({
                        title: "Season " + (season === null || season === void 0 ? void 0 : season.s),
                        episodesLink: season === null || season === void 0 ? void 0 : season.id,
                    });
                });
            }
            else {
                linkList.push({
                    title: meta.title,
                    directLinks: [{ link: id, title: "Movie", type: "movie" }],
                });
            }
            return Object.assign(Object.assign({}, meta), { linkList: linkList });
        }
        catch (err) {
            console.error(err);
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
