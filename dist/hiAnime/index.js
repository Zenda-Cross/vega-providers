"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiAnime = void 0;
const hiGetInfo_1 = require("./hiGetInfo");
const hiCatalog_1 = require("./hiCatalog");
const HiGetSteam_1 = require("./HiGetSteam");
const hiGetPosts_1 = require("./hiGetPosts");
exports.HiAnime = {
    catalog: hiCatalog_1.hiCatalog,
    genres: hiCatalog_1.hiGenresList,
    GetMetaData: hiGetInfo_1.hiGetInfo,
    GetHomePosts: hiGetPosts_1.hiGetPosts,
    GetStream: HiGetSteam_1.hiGetStream,
    GetSearchPosts: hiGetPosts_1.hiGetPostsSearch,
};
