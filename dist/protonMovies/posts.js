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

// providers/protonMovies/posts.ts
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
    const baseUrl = yield getBaseUrl("protonMovies");
    const url = `${baseUrl + filter}/page/${page}/`;
    return posts({ url, baseUrl, signal, axios, cheerio });
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = yield getBaseUrl("protonMovies");
    const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
    return posts({ url, baseUrl, signal, axios, cheerio });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    url,
    baseUrl,
    signal,
    axios,
    cheerio
  }) {
    try {
      let decodeHtml2 = function(encodedArray) {
        const joined = encodedArray.join("");
        const unescaped = joined.replace(/\\"/g, '"').replace(/\\'/g, "'");
        const cleaned = unescaped.replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\r/g, "\r");
        const decoded = cleaned.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        return decoded;
      };
      var decodeHtml = decodeHtml2;
      __name(decodeHtml2, "decodeHtml");
      const res = yield axios.get(url, {
        headers: {
          referer: baseUrl
        },
        signal
      });
      const data = res.data;
      const regex = /\[(?=.*?"<div class")(.*?)\]/g;
      const htmlArray = data == null ? void 0 : data.match(regex);
      const html = decodeHtml2(JSON.parse(htmlArray[htmlArray.length - 1]));
      const $ = cheerio.load(html);
      const catalog = [];
      $(".col.mb-4").map((i, element) => {
        const title = $(element).find("h5").text();
        const link = $(element).find("h5").find("a").attr("href");
        const image = $(element).find("img").attr("data-src") || $(element).find("img").attr("src") || "";
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
      console.error("protonGetPosts error ", err);
      return [];
    }
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

