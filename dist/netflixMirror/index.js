"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.netflixMirror = void 0;
const nfCatalog_1 = require("./nfCatalog");
const nfGetInfo_1 = require("./nfGetInfo");
const nfGetPost_1 = require("./nfGetPost");
const nfGetEpisodes_1 = require("./nfGetEpisodes");
const nfGetSteam_1 = require("./nfGetSteam");
exports.netflixMirror = {
    catalog: nfCatalog_1.nfCatalog,
    genres: nfCatalog_1.nfGenresList,
    GetMetaData: nfGetInfo_1.nfGetInfo,
    GetHomePosts: nfGetPost_1.nfGetPost,
    GetStream: nfGetSteam_1.nfGetStream,
    GetEpisodeLinks: nfGetEpisodes_1.nfGetEpisodes,
    GetSearchPosts: nfGetPost_1.nfGetPostsSearch,
};
