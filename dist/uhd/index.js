"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uhdMovies = void 0;
const uhCtatalog_1 = require("./uhCtatalog");
const uhdGetPosts_1 = require("./uhdGetPosts");
const uhdGetStream_1 = require("./uhdGetStream");
const getUhdInfo_1 = require("./getUhdInfo");
exports.uhdMovies = {
    catalog: uhCtatalog_1.uhdCatalogList,
    genres: uhCtatalog_1.uhdGenresList,
    GetMetaData: getUhdInfo_1.getUhdInfo,
    GetHomePosts: uhdGetPosts_1.uhdGetPosts,
    GetStream: uhdGetStream_1.uhdGetStream,
    nonStreamableServer: ['Gdrive-Instant'],
    GetSearchPosts: uhdGetPosts_1.uhdGetPostsSearch,
};
