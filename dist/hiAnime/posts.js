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
    return __awaiter(this, arguments, void 0, function* ({ filter, page, signal, providerContext, }) {
        const { getBaseUrl, axios } = providerContext;
        const baseUrl = yield getBaseUrl("consumet");
        const url = `${baseUrl + filter}?page=${page}`;
        return posts({ url, signal, axios });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        const { getBaseUrl, axios } = providerContext;
        const baseUrl = yield getBaseUrl("consumet");
        const url = `${baseUrl}/anime/zoro/${searchQuery}?page=${page}`;
        return posts({ url, signal, axios });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, signal, axios, }) {
        var _b;
        try {
            const res = yield axios.get(url, { signal });
            const data = (_b = res.data) === null || _b === void 0 ? void 0 : _b.results;
            const catalog = [];
            data === null || data === void 0 ? void 0 : data.map((element) => {
                const title = element.title;
                const link = element.id;
                const image = element.image;
                if (title && link && image) {
                    catalog.push({
                        title: title,
                        link: link,
                        image: image,
                    });
                }
            });
            return catalog;
        }
        catch (err) {
            console.error("zoro error ", err);
            return [];
        }
    });
}
