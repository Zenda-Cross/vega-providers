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
exports.ringzData = exports.headers = exports.getSearchPosts = exports.getPosts = void 0;
exports.getRingzMovies = getRingzMovies;
exports.getRingzShows = getRingzShows;
exports.getRingzAnime = getRingzAnime;
exports.getRingzAdult = getRingzAdult;
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, signal, providerContext, }) {
        return posts({ filter, signal, providerContext });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, // providerContext,
     }) {
        if (page > 1)
            return [];
        function searchData(data, query) {
            // Convert query to lowercase for case-insensitive search
            const searchQuery = query.toLowerCase();
            // Filter movies based on movie name (mn)
            return data.filter((movie) => {
                // Convert movie name to lowercase and check if it includes the search query
                const movieName = movie.mn.toLowerCase();
                return movieName.includes(searchQuery);
            });
        }
        try {
            const catalog = [];
            const promises = [getRingzMovies(), getRingzShows(), getRingzAnime()];
            const responses = yield Promise.all(promises);
            responses.map((response) => {
                const searchResults = searchData(response, searchQuery);
                searchResults.map((element) => {
                    const title = (element === null || element === void 0 ? void 0 : element.kn) || (element === null || element === void 0 ? void 0 : element.mn);
                    const link = JSON.stringify(element);
                    const image = element === null || element === void 0 ? void 0 : element.IV;
                    if (title && link) {
                        catalog.push({
                            title: title,
                            link: link,
                            image: image,
                        });
                    }
                });
            });
            return catalog;
        }
        catch (err) {
            console.error("ringz error ", err);
            return [];
        }
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, // signal,
     }) {
        try {
            let response;
            if (filter === "MOVIES") {
                response = getRingzMovies();
            }
            if (filter === "SERIES") {
                response = getRingzShows();
            }
            if (filter === "ANIME") {
                response = getRingzAnime();
            }
            const data = yield response;
            const catalog = [];
            data.map((element) => {
                const title = (element === null || element === void 0 ? void 0 : element.kn) || (element === null || element === void 0 ? void 0 : element.mn);
                const link = JSON.stringify(element);
                const image = element === null || element === void 0 ? void 0 : element.IV;
                if (title && link) {
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
            console.error("ringz error ", err);
            return [];
        }
    });
}
exports.headers = {
    "cf-access-client-id": "833049b087acf6e787cedfd85d1ccdb8.access",
    "cf-access-client-secret": "02db296a961d7513c3102d7785df4113eff036b2d57d060ffcc2ba3ba820c6aa",
};
const BASE_URL = "https://privatereporz.pages.dev";
function getRingzMovies() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${BASE_URL}/test.json`, {
                headers: Object.assign({}, exports.headers),
            });
            const data = yield response.json();
            return data.AllMovieDataList;
        }
        catch (error) {
            console.error(error);
        }
    });
}
function getRingzShows() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${BASE_URL}/srs.json`, {
                headers: Object.assign({}, exports.headers),
            });
            const data = yield response.json();
            return data.webSeriesDataList;
        }
        catch (error) {
            console.error(error);
        }
    });
}
function getRingzAnime() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${BASE_URL}/anime.json`, {
                headers: Object.assign({}, exports.headers),
            });
            const data = yield response.json();
            return data.webSeriesDataList;
        }
        catch (error) {
            console.error(error);
        }
    });
}
function getRingzAdult() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${BASE_URL}/desihub.json`, {
                headers: Object.assign({}, exports.headers),
            });
            const data = yield response.json();
            return data.webSeriesDataList;
        }
        catch (error) {
            console.error(error);
        }
    });
}
exports.ringzData = {
    getRingzMovies,
    getRingzShows,
    getRingzAnime,
    getRingzAdult,
};
