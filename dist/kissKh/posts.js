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
        var _b;
        const { getBaseUrl, axios } = providerContext;
        const baseUrl = yield getBaseUrl("kissKh");
        const url = `${baseUrl + filter}&type=0`;
        try {
            const res = yield axios.get(url, { signal });
            const data = (_b = res.data) === null || _b === void 0 ? void 0 : _b.data;
            const catalog = [];
            data === null || data === void 0 ? void 0 : data.map((element) => {
                const title = element.title;
                const link = baseUrl + `/api/DramaList/Drama/${element === null || element === void 0 ? void 0 : element.id}?isq=false`;
                const image = element.thumbnail;
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
            console.error("kiss error ", err);
            return [];
        }
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, signal, providerContext, }) {
        const { getBaseUrl, axios } = providerContext;
        const baseUrl = yield getBaseUrl("kissKh");
        const url = `${baseUrl}/api/DramaList/Search?q=${searchQuery}&type=0`;
        try {
            const res = yield axios.get(url, { signal });
            const data = res.data;
            const catalog = [];
            data === null || data === void 0 ? void 0 : data.map((element) => {
                const title = element.title;
                const link = baseUrl + `/api/DramaList/Drama/${element === null || element === void 0 ? void 0 : element.id}?isq=false`;
                const image = element.thumbnail;
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
            console.error("kiss error ", err);
            return [];
        }
    });
};
exports.getSearchPosts = getSearchPosts;
