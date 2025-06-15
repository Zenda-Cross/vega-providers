"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filmyfly = void 0;
const ffCatalog_1 = require("./ffCatalog");
const ffGetEpisodes_1 = require("./ffGetEpisodes");
const ffGetMeta_1 = require("./ffGetMeta");
const ffGetPosts_1 = require("./ffGetPosts");
const ffGetStream_1 = require("./ffGetStream");
exports.filmyfly = {
    catalog: ffCatalog_1.ffCatalog,
    genres: ffCatalog_1.ffGenresList,
    GetHomePosts: ffGetPosts_1.ffGetPosts,
    GetMetaData: ffGetMeta_1.ffGetInfo,
    GetSearchPosts: ffGetPosts_1.ffGetPostsSearch,
    GetEpisodeLinks: ffGetEpisodes_1.ffEpisodeLinks,
    GetStream: ffGetStream_1.ffGetStream,
};
