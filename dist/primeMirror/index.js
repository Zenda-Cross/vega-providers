"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.primeMirror = void 0;
const nfCatalog_1 = require("../netflixMirror/nfCatalog");
const nfGetPost_1 = require("../netflixMirror/nfGetPost");
const pmGetInfo_1 = require("./pmGetInfo");
const pmGetStream_1 = require("./pmGetStream");
const pmGetEpisodes_1 = require("./pmGetEpisodes");
exports.primeMirror = {
    catalog: nfCatalog_1.nfCatalog,
    genres: nfCatalog_1.nfGenresList,
    GetMetaData: pmGetInfo_1.pmGetInfo,
    GetHomePosts: nfGetPost_1.nfGetPost,
    GetStream: pmGetStream_1.pmGetStream,
    GetEpisodeLinks: pmGetEpisodes_1.pmGetEpisodes,
    GetSearchPosts: nfGetPost_1.nfGetPostsSearch,
};
