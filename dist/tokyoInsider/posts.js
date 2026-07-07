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

// providers/tokyoInsider/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    // providerValue,
    signal,
    providerContext
  }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseURL = yield getBaseUrl("tokyoinsider");
    const start = page < 2 ? 0 : (page - 1) * 20;
    const url = `${baseURL}/${filter}&start=${start}`;
    return posts({ baseURL, url, signal, axios, cheerio });
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
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseURL = yield getBaseUrl("tokyoinsider");
    const start = page < 2 ? 0 : (page - 1) * 20;
    const url = `${baseURL}/anime/search?k=${searchQuery}&start=${start}`;
    return posts({ baseURL, url, signal, axios, cheerio });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    baseURL,
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
      $('td.c_h2[width="40"]').map((i, element) => {
        var _a;
        const image = (_a = $(element).find(".a_img").attr("src")) == null ? void 0 : _a.replace("small", "default");
        const title = $(element).find("a").attr("title");
        const link = baseURL + $(element).find("a").attr("href");
        if (title && link && image) {
          catalog.push({
            title,
            link,
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      return [];
    }
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

