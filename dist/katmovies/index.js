"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.katMoviesHd = void 0;
const katCatalog_1 = require("./katCatalog");
const katGetEpsodes_1 = require("./katGetEpsodes");
const katGetInfo_1 = require("./katGetInfo");
const katGetPosts_1 = require("./katGetPosts");
const katGetSteam_1 = require("./katGetSteam");
exports.katMoviesHd = {
    catalog: katCatalog_1.katCatalog,
    genres: katCatalog_1.katGenresList,
    GetMetaData: katGetInfo_1.katGetInfo,
    GetHomePosts: katGetPosts_1.katGetPosts,
    GetStream: katGetSteam_1.katGetStream,
    GetEpisodeLinks: katGetEpsodes_1.katEpisodeLinks,
    GetSearchPosts: katGetPosts_1.katGetPostsSearch,
};
