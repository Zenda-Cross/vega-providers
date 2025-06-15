"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moviesDrive = void 0;
const catalog_1 = require("./catalog");
const driveGetEpisodesList_1 = require("./driveGetEpisodesList");
const driveGetInfo_1 = require("./driveGetInfo");
const driveGetPosts_1 = require("./driveGetPosts");
const driveGetStream_1 = require("./driveGetStream");
exports.moviesDrive = {
    catalog: catalog_1.driveCatalog,
    genres: catalog_1.driveGenresList,
    GetMetaData: driveGetInfo_1.driveGetInfo,
    GetHomePosts: driveGetPosts_1.driveGetPosts,
    GetStream: driveGetStream_1.driveGetStream,
    GetEpisodeLinks: driveGetEpisodesList_1.driveGetEpisodeLinks,
    GetSearchPosts: driveGetPosts_1.driveGetSearchPost,
};
