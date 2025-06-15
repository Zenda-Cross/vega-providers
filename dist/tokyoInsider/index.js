"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokyoInsider = void 0;
const catalog_1 = require("./catalog");
const tokyoGetInfo_1 = require("./tokyoGetInfo");
const tokyoGetPosts_1 = require("./tokyoGetPosts");
const tokyoGetStream_1 = require("./tokyoGetStream");
exports.tokyoInsider = {
    catalog: catalog_1.tokyoCatalogList,
    genres: catalog_1.tokyoGenresList,
    GetMetaData: tokyoGetInfo_1.tokyoGetInfo,
    GetHomePosts: tokyoGetPosts_1.tokyoGetPosts,
    GetStream: tokyoGetStream_1.tokyoGetStream,
    GetSearchPosts: tokyoGetPosts_1.tokyoGetPostsSearch,
    blurImage: true,
};
