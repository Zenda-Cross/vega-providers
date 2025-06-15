"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ringz = void 0;
const ringzGetPosts_1 = require("./ringzGetPosts");
const ringzGetMeta_1 = require("./ringzGetMeta");
const ringzCatalog_1 = require("./ringzCatalog");
const ringzGetStream_1 = require("./ringzGetStream");
exports.ringz = {
    catalog: ringzCatalog_1.ringzCatalogList,
    genres: ringzCatalog_1.ringzGenresList,
    GetMetaData: ringzGetMeta_1.ringzGetInfo,
    GetHomePosts: ringzGetPosts_1.ringzGetPosts,
    GetStream: ringzGetStream_1.ringzGetStream,
    GetSearchPosts: ringzGetPosts_1.ringzGetPostsSearch,
};
