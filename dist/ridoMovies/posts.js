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
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, signal, providerContext, }) {
        try {
            const catalog = [];
            const url = "https://cinemeta-catalogs.strem.io" + filter;
            console.log("allGetPostUrl", url);
            const res = yield providerContext.axios.get(url, {
                headers: providerContext.commonHeaders,
                signal,
            });
            const data = res.data;
            data === null || data === void 0 ? void 0 : data.metas.map((result) => {
                const title = result === null || result === void 0 ? void 0 : result.name;
                const id = (result === null || result === void 0 ? void 0 : result.imdb_id) || (result === null || result === void 0 ? void 0 : result.id);
                const type = result === null || result === void 0 ? void 0 : result.type;
                const image = result === null || result === void 0 ? void 0 : result.poster;
                if (id) {
                    catalog.push({
                        title: title,
                        link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
                        image: image,
                    });
                }
            });
            console.log("catalog", catalog.length);
            return catalog;
        }
        catch (err) {
            console.error("AutoEmbed error ", err);
            return [];
        }
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        try {
            const { axios, commonHeaders: headers } = providerContext;
            if (page > 1) {
                return [];
            }
            const catalog = [];
            const url2 = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURI(searchQuery)}.json`;
            const res2 = yield axios.get(url2, { headers, signal });
            const data2 = res2.data;
            data2 === null || data2 === void 0 ? void 0 : data2.metas.map((result) => {
                const title = (result === null || result === void 0 ? void 0 : result.name) || "";
                const id = (result === null || result === void 0 ? void 0 : result.imdb_id) || (result === null || result === void 0 ? void 0 : result.id);
                const image = result === null || result === void 0 ? void 0 : result.poster;
                const type = result === null || result === void 0 ? void 0 : result.type;
                if (id) {
                    catalog.push({
                        title: title,
                        link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
                        image: image,
                    });
                }
            });
            return catalog;
        }
        catch (err) {
            console.error("AutoEmbed error ", err);
            return [];
        }
    });
};
exports.getSearchPosts = getSearchPosts;
