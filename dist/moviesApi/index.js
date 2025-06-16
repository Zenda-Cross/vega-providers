"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moviesApi = void 0;
const catalog_1 = require("../autoEmbed/catalog");
const module_1 = require();
";;
const posts_1 = require("../autoEmbed/posts");
const stream_1 = require("./stream");
exports.moviesApi = {
    catalog: catalog_1.allCatalog,
    genres: catalog_1.allGenresList,
    GetMetaData: module_1.allGetInfo,
    GetHomePosts: posts_1.allGetPost,
    GetStream: stream_1.mpGetStream,
    GetSearchPosts: posts_1.allGetSearchPosts,
};
