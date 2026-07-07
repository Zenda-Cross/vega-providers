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

// providers/vadapav/posts.ts
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
    const baseUrl = yield getBaseUrl("vadapav");
    if (page > 1) {
      return [];
    }
    const url = `${baseUrl + filter}`;
    return posts({ baseUrl, url, signal, axios, cheerio });
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
    const baseUrl = yield getBaseUrl("vadapav");
    if (page > 1) {
      return [];
    }
    const url = `${baseUrl}/s/${searchQuery}`;
    return posts({ baseUrl, url, signal, axios, cheerio });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    // baseUrl,
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
      $('.directory-entry:not(:contains("Parent Directory"))').map(
        (i, element) => {
          var _a;
          const title = $(element).text();
          const link = $(element).attr("href");
          const imageTitle = (title == null ? void 0 : title.length) > 30 ? (_a = title == null ? void 0 : title.slice(0, 30)) == null ? void 0 : _a.replace(/\./g, " ") : title == null ? void 0 : title.replace(/\./g, " ");
          const image = `https://placehold.jp/23/000000/ffffff/200x400.png?text=${encodeURIComponent(
            imageTitle
          )}&css=%7B%22background%22%3A%22%20-webkit-gradient(linear%2C%20left%20bottom%2C%20left%20top%2C%20from(%233f3b3b)%2C%20to(%23000000))%22%2C%22text-transform%22%3A%22%20capitalize%22%7D`;
          if (title && link) {
            catalog.push({
              title,
              link,
              image
            });
          }
        }
      );
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

