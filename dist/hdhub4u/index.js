"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hdhub4uProvider = void 0;
const hdhubCatalog_1 = require("./hdhubCatalog");
const hdhubGetInfo_1 = require("./hdhubGetInfo");
const hdhub4uGetSteam_1 = require("./hdhub4uGetSteam");
const hdhubGetPosts_1 = require("./hdhubGetPosts");
exports.hdhub4uProvider = {
    catalog: hdhubCatalog_1.hdhub4uCatalog,
    genres: hdhubCatalog_1.hdhub4uGenresList,
    GetMetaData: hdhubGetInfo_1.hdhub4uGetInfo,
    GetStream: hdhub4uGetSteam_1.hdhub4uGetStream,
    GetHomePosts: hdhubGetPosts_1.hdhubGetPosts,
    GetSearchPosts: hdhubGetPosts_1.hdhubGetPostsSearch,
};
