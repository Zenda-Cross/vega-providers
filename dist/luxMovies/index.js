"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.luxMovies = void 0;
const luxGetPosts_1 = require("./luxGetPosts");
const getInfo_1 = require("../vega/getInfo");
const getStream_1 = require("../vega/getStream");
const getEpisodesLink_1 = require("../vega/getEpisodesLink");
const luxCatalog_1 = require("./luxCatalog");
exports.luxMovies = {
    catalog: luxCatalog_1.homeList,
    genres: luxCatalog_1.genresList,
    GetMetaData: getInfo_1.vegaGetInfo,
    GetHomePosts: luxGetPosts_1.luxGetPosts,
    GetStream: getStream_1.vegaGetStream,
    nonStreamableServer: ['filepress'],
    GetEpisodeLinks: getEpisodesLink_1.vegaGetEpisodeLinks,
    GetSearchPosts: luxGetPosts_1.luxGetPostsSearch,
};
