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

// providers/showbox/posts.ts
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
    const baseUrl = yield getBaseUrl("showbox");
    const url = `${baseUrl + filter}?page=${page}/`;
    return posts({ url, signal, baseUrl, axios, cheerio });
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
    const { getBaseUrl, axios, cheerio, commonHeaders } = providerContext;
    const baseUrl = yield getBaseUrl("showbox");
    const url = `${baseUrl}/search?keyword=${searchQuery}&page=${page}`;
    return posts({
      url,
      signal,
      baseUrl,
      axios,
      cheerio,
      headers: commonHeaders
    });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    url,
    signal,
    // baseUrl,
    axios,
    cheerio,
    headers
  }) {
    const maxRetries = 3;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = yield axios.get(url, { signal, headers });
        const data = res.data;
        console.log(data);
        const $ = cheerio.load(data);
        const catalog = [];
        $(".movie-item,.flw-item").map((i, element) => {
          const title = $(element).find(".film-name").text().trim();
          const link = $(element).find("a").attr("href");
          const image = $(element).find("img").attr("src");
          console.log(title, link, image);
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
        lastError = err;
        if (signal.aborted || attempt === maxRetries) {
          throw err;
        }
      }
    }
    throw lastError;
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

