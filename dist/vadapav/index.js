"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vadapavProvider = void 0;
const vadapavGetPosts_1 = require("./vadapavGetPosts");
const VagapavCatalog_1 = require("./VagapavCatalog");
const vadapavGetInfo_1 = require("./vadapavGetInfo");
const vadapavGetStream_1 = require("./vadapavGetStream");
const vadapavGetEpisodes_1 = require("./vadapavGetEpisodes");
exports.vadapavProvider = {
    catalog: VagapavCatalog_1.vadapavCatalogList,
    genres: VagapavCatalog_1.vadapavGenresList,
    GetHomePosts: vadapavGetPosts_1.vadapavGetPosts,
    GetEpisodeLinks: vadapavGetEpisodes_1.vadapavGetEpisodeLinks,
    GetMetaData: vadapavGetInfo_1.vadapavGetInfo,
    GetStream: vadapavGetStream_1.vadapavGetStream,
    GetSearchPosts: vadapavGetPosts_1.vadapavGetPostsSearch,
};
