"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ridoMovies = void 0;
const guardahdCatalog_1 = require("../guardahd/guardahdCatalog");
const allGetPost_1 = require("../autoEmbed/allGetPost");
const guardahdGetPosts_1 = require("../guardahd/guardahdGetPosts");
const ridoGetMeta_1 = require("./ridoGetMeta");
const ridoGetSream_1 = require("./ridoGetSream");
exports.ridoMovies = {
    catalog: guardahdCatalog_1.guardahdCatalog,
    genres: guardahdCatalog_1.guardahdGenresList,
    GetMetaData: ridoGetMeta_1.ridoGetInfo,
    GetHomePosts: allGetPost_1.allGetPost,
    GetStream: ridoGetSream_1.ridoGetStream,
    GetSearchPosts: guardahdGetPosts_1.guardahdGetSearchPosts,
};
