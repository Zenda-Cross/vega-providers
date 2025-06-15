"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiMovies = void 0;
const multiCatalog_1 = require("./multiCatalog");
const multiGetInfo_1 = require("./multiGetInfo");
const multiPosts_1 = require("./multiPosts");
const multiGetStream_1 = require("./multiGetStream");
exports.multiMovies = {
    catalog: multiCatalog_1.multiCatalog,
    genres: multiCatalog_1.multiGenresList,
    GetMetaData: multiGetInfo_1.multiGetInfo,
    GetHomePosts: multiPosts_1.multiGetPosts,
    GetStream: multiGetStream_1.multiGetStream,
    GetSearchPosts: multiPosts_1.multiGetPostsSearch,
};
