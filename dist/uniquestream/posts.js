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

// providers/uniquestream/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    signal,
    providerContext
  }) {
    var _a;
    const { axios, commonHeaders } = providerContext;
    const baseUrl = "https://anime.uniquestream.net";
    const url = `${baseUrl}/api/v1/videos/${filter}?page=${page}&limit=20&type=all`;
    try {
      const res = yield axios.get(url, { headers: commonHeaders, signal });
      const data = Array.isArray(res.data) ? res.data : ((_a = res.data) == null ? void 0 : _a.data) || [];
      return data.map((item) => ({
        title: item.title,
        link: `https://anime.uniquestream.net/api/v1/series/${item.content_id}`,
        image: item.image || ""
      }));
    } catch (error) {
      console.error("uniquestream getPosts failed", error);
      return [];
    }
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    var _a, _b;
    if (page > 1) {
      return [];
    }
    const { axios, commonHeaders } = providerContext;
    const baseUrl = "https://anime.uniquestream.net";
    const url = `${baseUrl}/api/v1/search?q=${encodeURIComponent(searchQuery)}`;
    try {
      const res = yield axios.get(url, { headers: commonHeaders, signal });
      const series = ((_a = res.data) == null ? void 0 : _a.series) || [];
      const movies = ((_b = res.data) == null ? void 0 : _b.movies) || [];
      const combined = [...series, ...movies];
      return combined.map((item) => ({
        title: item.title,
        link: `https://anime.uniquestream.net/api/v1/series/${item.content_id}`,
        image: item.image || ""
      }));
    } catch (error) {
      console.error("uniquestream getSearchPosts failed", error);
      return [];
    }
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

