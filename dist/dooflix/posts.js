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
const headers = {
    "Accept-Encoding": "gzip",
    "API-KEY": "2pm95lc6prpdbk0ppji9rsqo",
    Connection: "Keep-Alive",
    "If-Modified-Since": "Wed, 14 Aug 2024 13:00:04 GMT",
    "User-Agent": "okhttp/3.14.9",
};
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page, signal, providerContext, }) {
        try {
            const { axios, getBaseUrl } = providerContext;
            const baseUrl = yield getBaseUrl("dooflix");
            const catalog = [];
            const url = `${baseUrl + filter + `?page=${page}`}`;
            const res = yield axios.get(url, { headers, signal });
            const resData = res.data;
            if (!resData || typeof resData !== "string") {
                console.warn("Unexpected response format from dooflix API");
                return [];
            }
            let data;
            try {
                const jsonStart = resData.indexOf("[");
                const jsonEnd = resData.lastIndexOf("]") + 1;
                if (jsonStart === -1 || jsonEnd <= jsonStart) {
                    // If we can't find valid JSON array markers, try parsing the entire response
                    data = JSON.parse(resData);
                }
                else {
                    const jsonSubstring = resData.substring(jsonStart, jsonEnd);
                    const parsedArray = JSON.parse(jsonSubstring);
                    data = parsedArray.length > 0 ? parsedArray : resData;
                }
            }
            catch (parseError) {
                console.error("Error parsing dooflix response:", parseError);
                return [];
            }
            if (!Array.isArray(data)) {
                console.warn("Unexpected data format from dooflix API");
                return [];
            }
            data.forEach((result) => {
                const id = result === null || result === void 0 ? void 0 : result.videos_id;
                if (!id)
                    return;
                const type = !(result === null || result === void 0 ? void 0 : result.is_tvseries) ? "tvseries" : "movie";
                const link = `${baseUrl}/rest-api//v130/single_details?type=${type}&id=${id}`;
                const thumbnailUrl = result === null || result === void 0 ? void 0 : result.thumbnail_url;
                const image = (thumbnailUrl === null || thumbnailUrl === void 0 ? void 0 : thumbnailUrl.includes("https"))
                    ? thumbnailUrl
                    : thumbnailUrl === null || thumbnailUrl === void 0 ? void 0 : thumbnailUrl.replace("http", "https");
                catalog.push({
                    title: (result === null || result === void 0 ? void 0 : result.title) || "",
                    link,
                    image,
                });
            });
            return catalog;
        }
        catch (err) {
            console.error("dooflix error:", err);
            return [];
        }
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, providerContext, signal, }) {
        var _b, _c;
        try {
            if (page > 1) {
                return [];
            }
            const { axios, getBaseUrl } = providerContext;
            const catalog = [];
            const baseUrl = yield getBaseUrl("dooflix");
            const url = `${baseUrl}/rest-api//v130/search?q=${searchQuery}&type=movietvserieslive&range_to=0&range_from=0&tv_category_id=0&genre_id=0&country_id=0`;
            const res = yield axios.get(url, { headers, signal });
            const resData = res.data;
            if (!resData || typeof resData !== "string") {
                console.warn("Unexpected search response format from dooflix API");
                return [];
            }
            let data;
            try {
                const jsonStart = resData.indexOf("{");
                const jsonEnd = resData.lastIndexOf("}") + 1;
                if (jsonStart === -1 || jsonEnd <= jsonStart) {
                    data = resData;
                }
                else {
                    const jsonSubstring = resData.substring(jsonStart, jsonEnd);
                    const parsedData = JSON.parse(jsonSubstring);
                    data = (parsedData === null || parsedData === void 0 ? void 0 : parsedData.movie) ? parsedData : resData;
                }
            }
            catch (parseError) {
                console.error("Error parsing dooflix search response:", parseError);
                return [];
            }
            // Process movies
            (_b = data === null || data === void 0 ? void 0 : data.movie) === null || _b === void 0 ? void 0 : _b.forEach((result) => {
                const id = result === null || result === void 0 ? void 0 : result.videos_id;
                if (!id)
                    return;
                const link = `${baseUrl}/rest-api//v130/single_details?type=movie&id=${id}`;
                const thumbnailUrl = result === null || result === void 0 ? void 0 : result.thumbnail_url;
                const image = (thumbnailUrl === null || thumbnailUrl === void 0 ? void 0 : thumbnailUrl.includes("https"))
                    ? thumbnailUrl
                    : thumbnailUrl === null || thumbnailUrl === void 0 ? void 0 : thumbnailUrl.replace("http", "https");
                catalog.push({
                    title: (result === null || result === void 0 ? void 0 : result.title) || "",
                    link,
                    image,
                });
            });
            // Process TV series
            (_c = data === null || data === void 0 ? void 0 : data.tvseries) === null || _c === void 0 ? void 0 : _c.forEach((result) => {
                const id = result === null || result === void 0 ? void 0 : result.videos_id;
                if (!id)
                    return;
                const link = `${baseUrl}/rest-api//v130/single_details?type=tvseries&id=${id}`;
                const thumbnailUrl = result === null || result === void 0 ? void 0 : result.thumbnail_url;
                const image = (thumbnailUrl === null || thumbnailUrl === void 0 ? void 0 : thumbnailUrl.includes("https"))
                    ? thumbnailUrl
                    : thumbnailUrl === null || thumbnailUrl === void 0 ? void 0 : thumbnailUrl.replace("http", "https");
                catalog.push({
                    title: (result === null || result === void 0 ? void 0 : result.title) || "",
                    link,
                    image,
                });
            });
            return catalog;
        }
        catch (error) {
            console.error("dooflix search error:", error);
            return [];
        }
    });
};
exports.getSearchPosts = getSearchPosts;
