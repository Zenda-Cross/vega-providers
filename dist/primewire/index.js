"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.primewire = void 0;
const pwCatalogl_1 = require("./pwCatalogl");
const pwGetPosts_1 = require("./pwGetPosts");
const pwGetInfo_1 = require("./pwGetInfo");
const pwGetStream_1 = require("./pwGetStream");
exports.primewire = {
    catalog: pwCatalogl_1.pwCatalogList,
    genres: pwCatalogl_1.pwGenresList,
    GetMetaData: pwGetInfo_1.pwGetInfo,
    GetHomePosts: pwGetPosts_1.pwGetPosts,
    GetStream: pwGetStream_1.pwGetStream,
    GetSearchPosts: pwGetPosts_1.pwGetPostsSearch,
};
