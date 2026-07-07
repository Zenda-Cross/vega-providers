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

// providers/autoEmbed/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    signal,
    providerContext
  }) {
    try {
      const catalog = [];
      const url = "https://cinemeta-catalogs.strem.io" + filter;
      console.log("allGetPostUrl", url);
      const res = yield providerContext.axios.get(url, {
        headers: providerContext.commonHeaders,
        signal
      });
      const data = res.data;
      data == null ? void 0 : data.metas.map((result) => {
        const title = result == null ? void 0 : result.name;
        const id = (result == null ? void 0 : result.imdb_id) || (result == null ? void 0 : result.id);
        const type = result == null ? void 0 : result.type;
        const image = result == null ? void 0 : result.poster;
        if (id) {
          catalog.push({
            title,
            link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
            image
          });
        }
      });
      console.log("catalog", catalog.length);
      return catalog;
    } catch (err) {
      console.error("AutoEmbed error ", err);
      return [];
    }
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    // providerValue,
    signal,
    providerContext
  }) {
    try {
      if (page > 1) {
        return [];
      }
      const catalog = [];
      const url1 = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURI(
        searchQuery
      )}.json`;
      const url2 = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURI(
        searchQuery
      )}.json`;
      const res = yield providerContext.axios.get(url1, {
        headers: providerContext.commonHeaders,
        signal
      });
      const data = res.data;
      data == null ? void 0 : data.metas.map((result) => {
        const title = result.name || "";
        const id = (result == null ? void 0 : result.imdb_id) || (result == null ? void 0 : result.id);
        const image = result == null ? void 0 : result.poster;
        const type = result == null ? void 0 : result.type;
        if (id) {
          catalog.push({
            title,
            link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
            image
          });
        }
      });
      const res2 = yield providerContext.axios.get(url2, {
        headers: providerContext.commonHeaders,
        signal
      });
      const data2 = res2.data;
      data2 == null ? void 0 : data2.metas.map((result) => {
        const title = (result == null ? void 0 : result.name) || "";
        const id = (result == null ? void 0 : result.imdb_id) || (result == null ? void 0 : result.id);
        const image = result == null ? void 0 : result.poster;
        const type = result == null ? void 0 : result.type;
        if (id) {
          catalog.push({
            title,
            link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("AutoEmbed error ", err);
      return [];
    }
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

