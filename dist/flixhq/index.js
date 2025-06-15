"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flixhq = void 0;
const flixhqCatalog_1 = require("./flixhqCatalog");
const flixhqGetInfo_1 = require("./flixhqGetInfo");
const flixhqGetPosts_1 = require("./flixhqGetPosts");
const flixhqGetStream_1 = require("./flixhqGetStream");
exports.flixhq = {
    catalog: flixhqCatalog_1.flixhqCatalog,
    genres: flixhqCatalog_1.flixhqGenresList,
    GetMetaData: flixhqGetInfo_1.flixhqGetInfo,
    GetHomePosts: flixhqGetPosts_1.flixhqGetPosts,
    GetStream: flixhqGetStream_1.flixhqGetStream,
    GetSearchPosts: flixhqGetPosts_1.flixhqGetSearchPost,
    nonDownloadableServer: ['upcloud-MultiQuality', 'vidcloud-MultiQuality'],
    nonStreamableServer: [
        'upcloud-1080',
        'upcloud-720',
        'upcloud-480',
        'upcloud-360',
        'vidcloud-1080',
        'vidcloud-720',
        'vidcloud-480',
        'vidcloud-360',
    ],
};
