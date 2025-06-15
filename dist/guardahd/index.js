"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardahd = void 0;
const guardahdCatalog_1 = require("./guardahdCatalog");
const allGetInfo_1 = require("../autoEmbed/allGetInfo");
const allGetPost_1 = require("../autoEmbed/allGetPost");
const guardahdGetPosts_1 = require("./guardahdGetPosts");
const GetGuardahdStream_1 = require("./GetGuardahdStream");
exports.guardahd = {
    catalog: guardahdCatalog_1.guardahdCatalog,
    genres: guardahdCatalog_1.guardahdGenresList,
    GetMetaData: allGetInfo_1.allGetInfo,
    GetHomePosts: allGetPost_1.allGetPost,
    GetStream: GetGuardahdStream_1.GuardahdGetStream,
    GetSearchPosts: guardahdGetPosts_1.guardahdGetSearchPosts,
};
