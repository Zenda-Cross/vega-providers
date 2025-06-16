"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ringzData = exports.headers = exports.getSearchPosts = exports.getPosts = void 0;
exports.getRingzMovies = getRingzMovies;
exports.getRingzShows = getRingzShows;
exports.getRingzAnime = getRingzAnime;
exports.getRingzAdult = getRingzAdult;
const getPosts = async function ({ filter, signal, providerContext, }) {
    return posts({ filter, signal, providerContext });
};
exports.getPosts = getPosts;
const getSearchPosts = async function ({ searchQuery, page, // providerContext,
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
        const responses = await Promise.all(promises);
        responses.map((response) => {
            const searchResults = searchData(response, searchQuery);
            searchResults.map((element) => {
                const title = element?.kn || element?.mn;
                const link = JSON.stringify(element);
                const image = element?.IV;
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
};
exports.getSearchPosts = getSearchPosts;
async function posts({ filter, // signal,
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
        const data = await response;
        const catalog = [];
        data.map((element) => {
            const title = element?.kn || element?.mn;
            const link = JSON.stringify(element);
            const image = element?.IV;
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
}
exports.headers = {
    "cf-access-client-id": "833049b087acf6e787cedfd85d1ccdb8.access",
    "cf-access-client-secret": "02db296a961d7513c3102d7785df4113eff036b2d57d060ffcc2ba3ba820c6aa",
};
const BASE_URL = "https://privatereporz.pages.dev";
async function getRingzMovies() {
    try {
        const response = await fetch(`${BASE_URL}/test.json`, {
            headers: {
                ...exports.headers,
            },
        });
        const data = await response.json();
        return data.AllMovieDataList;
    }
    catch (error) {
        console.error(error);
    }
}
async function getRingzShows() {
    try {
        const response = await fetch(`${BASE_URL}/srs.json`, {
            headers: {
                ...exports.headers,
            },
        });
        const data = await response.json();
        return data.webSeriesDataList;
    }
    catch (error) {
        console.error(error);
    }
}
async function getRingzAnime() {
    try {
        const response = await fetch(`${BASE_URL}/anime.json`, {
            headers: {
                ...exports.headers,
            },
        });
        const data = await response.json();
        return data.webSeriesDataList;
    }
    catch (error) {
        console.error(error);
    }
}
async function getRingzAdult() {
    try {
        const response = await fetch(`${BASE_URL}/desihub.json`, {
            headers: {
                ...exports.headers,
            },
        });
        const data = await response.json();
        return data.webSeriesDataList;
    }
    catch (error) {
        console.error(error);
    }
}
exports.ringzData = {
    getRingzMovies,
    getRingzShows,
    getRingzAnime,
    getRingzAdult,
};
