"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kissKhProvider = void 0;
const kissKhCatalog_1 = require("./kissKhCatalog");
const kissKhGetInfo_1 = require("./kissKhGetInfo");
const kissKhGetPosts_1 = require("./kissKhGetPosts");
const kissKhGetStream_1 = require("./kissKhGetStream");
exports.kissKhProvider = {
    catalog: kissKhCatalog_1.kisskhCatalog,
    genres: kissKhCatalog_1.kisskhGenresList,
    GetHomePosts: kissKhGetPosts_1.kissKhGetPosts,
    GetMetaData: kissKhGetInfo_1.kissKhGetInfo,
    GetStream: kissKhGetStream_1.kissKhGetStream,
    GetSearchPosts: kissKhGetPosts_1.kissKhGetPostsSearch,
};
