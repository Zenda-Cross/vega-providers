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

// providers/primewire/posts.ts
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
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = yield getBaseUrl("primewire");
    const url = `${baseUrl + filter}&page=${page}`;
    return posts({ baseUrl, url, signal, axios, cheerio });
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    const { getBaseUrl, axios, cheerio, Aes } = providerContext;
    const getSHA256ofJSON = /* @__PURE__ */ __name(function(input) {
      return __async(this, null, function* () {
        return yield Aes.sha1(input);
      });
    }, "getSHA256ofJSON");
    const baseUrl = yield getBaseUrl("primewire");
    const hash = yield getSHA256ofJSON(searchQuery + "JyjId97F9PVqUPuMO0");
    const url = `${baseUrl}/filter?s=${searchQuery}&page=${page}&ds=${hash.slice(
      0,
      10
    )}`;
    return posts({ baseUrl, url, signal, axios, cheerio });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    baseUrl,
    url,
    signal,
    axios,
    cheerio
  }) {
    try {
      const res = yield axios.get(url, { signal });
      const data = res.data;
      const $ = cheerio.load(data);
      const catalog = [];
      $(".index_item.index_item_ie").map((i, element) => {
        const title = $(element).find("a").attr("title");
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src") || "";
        if (title && link) {
          catalog.push({
            title,
            link: baseUrl + link,
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("primewire error ", err);
      return [];
    }
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

