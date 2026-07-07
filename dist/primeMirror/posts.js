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

// providers/primeMirror/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    providerValue,
    signal,
    providerContext
  }) {
    try {
      const { getBaseUrl, cheerio } = providerContext;
      const baseUrl = yield getBaseUrl("nfMirror");
      const catalog = [];
      if (page > 1) {
        return [];
      }
      const isPrime = providerValue === "primeMirror" ? "isPrime=true" : "isPrime=false";
      const url = `https://netmirror.8man.dev/api/net-proxy?${isPrime}&url=${baseUrl + filter}`;
      const res = yield fetch(url, {
        signal,
        method: "GET",
        credentials: "omit"
      });
      const data = yield res.text();
      const $ = cheerio.load(data);
      $("a.post-data").map((i, element) => {
        const title = "";
        const id = $(element).attr("data-post");
        const image = $(element).find("img").attr("data-src") || "";
        if (id) {
          catalog.push({
            title,
            link: baseUrl + `${providerValue === "netflixMirror" ? "/post.php?id=" : "/pv/post.php?id="}` + id + "&t=" + Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3),
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("nf error ", err);
      return [];
    }
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    providerValue,
    signal,
    providerContext
  }) {
    var _a;
    const { getBaseUrl } = providerContext;
    try {
      if (page > 1) {
        return [];
      }
      const catalog = [];
      const baseUrl = yield getBaseUrl("nfMirror");
      const isPrime = providerValue === "primeMirror" ? "isPrime=true" : "isPrime=false";
      const url = `https://netmirror.8man.dev/api/net-proxy?${isPrime}&url=${baseUrl}${providerValue === "netflixMirror" ? "" : "/pv"}/search.php?s=${encodeURI(searchQuery)}`;
      const res = yield fetch(url, {
        signal,
        method: "GET",
        credentials: "omit"
      });
      const data = yield res.json();
      (_a = data == null ? void 0 : data.searchResult) == null ? void 0 : _a.forEach((result) => {
        const title = (result == null ? void 0 : result.t) || "";
        const id = result == null ? void 0 : result.id;
        const image = providerValue === "netflixMirror" ? `https://imgcdn.media/poster/v/${id}.jpg` : `https://imgcdn.media/pv/341/${id}.jpg`;
        if (id) {
          catalog.push({
            title,
            link: baseUrl + `${providerValue === "netflixMirror" ? "/mobile/post.php?id=" : "/mobile/pv/post.php?id="}` + id + "&t=" + Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3),
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("Search error:", err);
      return [];
    }
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

