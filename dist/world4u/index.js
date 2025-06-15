"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.world4u = void 0;
const catalog_1 = require("./catalog");
const world4uGetEpisodeLinks_1 = require("./world4uGetEpisodeLinks");
const world4uGetInfo_1 = require("./world4uGetInfo");
const world4uGetPosts_1 = require("./world4uGetPosts");
const world4uGetStream_1 = require("./world4uGetStream");
exports.world4u = {
    catalog: catalog_1.world4uCatalogList,
    genres: catalog_1.world4uGenresList,
    GetMetaData: world4uGetInfo_1.world4uGetInfo,
    GetHomePosts: world4uGetPosts_1.world4uGetPosts,
    GetStream: world4uGetStream_1.world4uGetStream,
    GetEpisodeLinks: world4uGetEpisodeLinks_1.world4uGetEpisodeLinks,
    GetSearchPosts: world4uGetPosts_1.world4uGetPostsSearch,
};
