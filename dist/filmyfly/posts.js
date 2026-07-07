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

// providers/filmyfly/posts.ts
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
    const { getBaseUrl } = providerContext;
    const baseUrl = yield getBaseUrl("filmyfly");
    const url = `${baseUrl + filter}/${page}`;
    return posts({ url, signal, baseUrl, providerContext });
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = yield getBaseUrl("filmyfly");
    const url = `${baseUrl}/site-1.html?to-search=${searchQuery}`;
    if (page > 1) {
      return [];
    }
    return posts({ url, signal, baseUrl, providerContext });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    url,
    signal,
    baseUrl,
    providerContext
  }) {
    try {
      const { cheerio, commonHeaders: headers } = providerContext;
      const res = yield fetch(url, { headers, signal });
      const data = yield res.text();
      const $ = cheerio.load(data);
      const catalog = [];
      $(".A2,.A10,.fl").map((i, element) => {
        const title = $(element).find("a").eq(1).text() || $(element).find("b").text();
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src");
        if (title && link && image) {
          catalog.push({
            title,
            link: baseUrl + link,
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("ff error ", err);
      return [];
    }
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

