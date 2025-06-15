"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showBox = void 0;
const sbCatalog_1 = require("./sbCatalog");
const sbGetEpisodeList_1 = require("./sbGetEpisodeList");
const sbGetMeta_1 = require("./sbGetMeta");
const sbGetPosts_1 = require("./sbGetPosts");
const sbGetStream_1 = require("./sbGetStream");
exports.showBox = {
    catalog: sbCatalog_1.catalogList,
    genres: sbCatalog_1.sbGenresList,
    GetMetaData: sbGetMeta_1.sbGetInfo,
    GetHomePosts: sbGetPosts_1.sbGetPosts,
    GetStream: sbGetStream_1.sbGetStream,
    GetSearchPosts: sbGetPosts_1.sbGetPostsSearch,
    GetEpisodeLinks: sbGetEpisodeList_1.sbGetEpisodeLinks,
};
