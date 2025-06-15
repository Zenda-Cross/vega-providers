"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vegaMovies = void 0;
const getInfo_1 = require("./getInfo");
const getStream_1 = require("./getStream");
const getEpisodesLink_1 = require("./getEpisodesLink");
const getPosts_1 = require("./getPosts");
const catalog_1 = require("./catalog");
exports.vegaMovies = {
    catalog: catalog_1.homeList,
    genres: catalog_1.genresList,
    GetMetaData: getInfo_1.vegaGetInfo,
    GetHomePosts: getPosts_1.vegaGetPosts,
    GetStream: getStream_1.vegaGetStream,
    nonStreamableServer: ['filepress', 'hubcloud', 'HubCdn'],
    GetEpisodeLinks: getEpisodesLink_1.vegaGetEpisodeLinks,
    GetSearchPosts: getPosts_1.vegaGetPostsSearch,
};
