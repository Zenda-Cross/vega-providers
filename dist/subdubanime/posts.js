"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// providers/subdubanime/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    providerContext
  }) {
    var _a;
    try {
      const { axios } = providerContext;
      const res = yield axios.get("https://test.blakiteapi.xyz/api/getAllAnime.php");
      const catalogData = ((_a = res.data) == null ? void 0 : _a.data) || {};
      const categoryItems = catalogData[filter] ? Object.values(catalogData[filter]) : [];
      const limit = 20;
      const start = (page - 1) * limit;
      const sliced = categoryItems.slice(start, start + limit);
      const postsList = [];
      sliced.forEach((item) => {
        var _a2, _b;
        const title = item.title;
        const link = item.tmdbId || item.originalTmdbId;
        const image = ((_a2 = item.IMAGES) == null ? void 0 : _a2.poster) || ((_b = item.IMAGES) == null ? void 0 : _b.backdrop) || "";
        if (title && link) {
          postsList.push({
            title,
            link,
            image
          });
        }
      });
      return postsList;
    } catch (err) {
      console.error("Genga getPosts error:", err);
      return [];
    }
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    providerContext
  }) {
    var _a;
    try {
      const { axios } = providerContext;
      const res = yield axios.get("https://test.blakiteapi.xyz/api/getAllAnime.php");
      const catalogData = ((_a = res.data) == null ? void 0 : _a.data) || {};
      const query = searchQuery.toLowerCase();
      const postsList = [];
      for (const cat of ["movies", "series", "dramas"]) {
        const items = catalogData[cat] ? Object.values(catalogData[cat]) : [];
        items.forEach((item) => {
          var _a2, _b, _c;
          const title = item.title || "";
          const genres = ((_a2 = item.TMDB_DATA) == null ? void 0 : _a2.genres) || [];
          const isMatch = title.toLowerCase().includes(query) || genres.some((g) => g.toLowerCase().includes(query));
          if (isMatch) {
            const link = item.tmdbId || item.originalTmdbId;
            const image = ((_b = item.IMAGES) == null ? void 0 : _b.poster) || ((_c = item.IMAGES) == null ? void 0 : _c.backdrop) || "";
            postsList.push({
              title,
              link,
              image
            });
          }
        });
      }
      return postsList;
    } catch (err) {
      console.error("Genga getSearchPosts error:", err);
      return [];
    }
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

