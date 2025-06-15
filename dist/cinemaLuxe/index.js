"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cinemaLuxe = void 0;
const clCatalog_1 = require("./clCatalog");
const clGetMeta_1 = require("./clGetMeta");
const clGetEpisodes_1 = require("./clGetEpisodes");
const clGetPosts_1 = require("./clGetPosts");
const clGetSteam_1 = require("./clGetSteam");
exports.cinemaLuxe = {
    catalog: clCatalog_1.clCatalog,
    genres: clCatalog_1.clGenresList,
    GetHomePosts: clGetPosts_1.clGetPosts,
    GetMetaData: clGetMeta_1.clGetInfo,
    GetSearchPosts: clGetPosts_1.clGetPostsSearch,
    GetEpisodeLinks: clGetEpisodes_1.clsEpisodeLinks,
    GetStream: clGetSteam_1.clGetStream,
};
