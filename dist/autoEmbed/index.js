"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoEmbed = void 0;
const allCatalog_1 = require("./allCatalog");
const allGetInfo_1 = require("./allGetInfo");
const allGetStream_1 = require("./allGetStream");
const allGetPost_1 = require("./allGetPost");
exports.autoEmbed = {
    catalog: allCatalog_1.allCatalog,
    genres: allCatalog_1.allGenresList,
    GetMetaData: allGetInfo_1.allGetInfo,
    GetHomePosts: allGetPost_1.allGetPost,
    GetStream: allGetStream_1.allGetStream,
    GetSearchPosts: allGetPost_1.allGetSearchPosts,
};
