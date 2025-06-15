"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dooflixProvider = void 0;
const dooCatalog_1 = require("./dooCatalog");
const dooGetInfo_1 = require("./dooGetInfo");
const dooGetPosts_1 = require("./dooGetPosts");
const dooGetSteam_1 = require("./dooGetSteam");
exports.dooflixProvider = {
    catalog: dooCatalog_1.dooCatalog,
    genres: dooCatalog_1.dooGenresList,
    GetMetaData: dooGetInfo_1.dooGetInfo,
    GetStream: dooGetSteam_1.dooGetStream,
    GetHomePosts: dooGetPosts_1.dooGetPost,
    GetSearchPosts: dooGetPosts_1.dooGetSearchPost,
};
