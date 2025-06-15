"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modMovies = void 0;
const catalog_1 = require("./catalog");
const modGetInfo_1 = require("./modGetInfo");
const modGetEpisodesList_1 = require("./modGetEpisodesList");
const modGetPosts_1 = require("./modGetPosts");
const modGetStream_1 = require("./modGetStream");
exports.modMovies = {
    catalog: catalog_1.catalogList,
    genres: catalog_1.modGenresList,
    GetMetaData: modGetInfo_1.modGetInfo,
    GetHomePosts: modGetPosts_1.modGetPosts,
    GetStream: modGetStream_1.modGetStream,
    GetEpisodeLinks: modGetEpisodesList_1.modGetEpisodeLinks,
    // nonStreamableServer: ['Gdrive-Instant'],
    GetSearchPosts: modGetPosts_1.modGetPostsSearch,
};
