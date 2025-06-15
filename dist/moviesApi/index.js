"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moviesApi = void 0;
const allCatalog_1 = require("../autoEmbed/allCatalog");
const allGetInfo_1 = require("../autoEmbed/allGetInfo");
const allGetPost_1 = require("../autoEmbed/allGetPost");
const mpGetStream_1 = require("./mpGetStream");
exports.moviesApi = {
    catalog: allCatalog_1.allCatalog,
    genres: allCatalog_1.allGenresList,
    GetMetaData: allGetInfo_1.allGetInfo,
    GetHomePosts: allGetPost_1.allGetPost,
    GetStream: mpGetStream_1.mpGetStream,
    GetSearchPosts: allGetPost_1.allGetSearchPosts,
};
