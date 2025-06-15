"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protonMovies = void 0;
const protonCatalog_1 = require("./protonCatalog");
const protonGetPosts_1 = require("./protonGetPosts");
const protonGetMeta_1 = require("./protonGetMeta");
const protonGetStream_1 = require("./protonGetStream");
exports.protonMovies = {
    catalog: protonCatalog_1.protonCatalogList,
    genres: protonCatalog_1.protonGenresList,
    GetMetaData: protonGetMeta_1.protonGetInfo,
    GetHomePosts: protonGetPosts_1.protonGetPosts,
    GetStream: protonGetStream_1.protonGetStream,
    GetSearchPosts: protonGetPosts_1.protonGetPostsSearch,
};
