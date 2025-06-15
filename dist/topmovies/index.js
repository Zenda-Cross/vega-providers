"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topMovies = void 0;
const modGetInfo_1 = require("../mod/modGetInfo");
const modGetEpisodesList_1 = require("../mod/modGetEpisodesList");
const modGetStream_1 = require("../mod/modGetStream");
const topGetPosts_1 = require("./topGetPosts");
const topCatalog_1 = require("./topCatalog");
exports.topMovies = {
    catalog: topCatalog_1.topCatalogList,
    genres: topCatalog_1.topGenresList,
    GetMetaData: modGetInfo_1.modGetInfo,
    GetHomePosts: topGetPosts_1.topGetPosts,
    GetStream: modGetStream_1.modGetStream,
    GetEpisodeLinks: modGetEpisodesList_1.modGetEpisodeLinks,
    nonStreamableServer: [],
    GetSearchPosts: topGetPosts_1.topGetPostsSearch,
};
