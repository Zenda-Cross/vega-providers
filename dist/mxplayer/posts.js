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

// providers/mxplayer/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
var cachedUserId = null;
var getUserId = /* @__PURE__ */ __name(() => {
  if (!cachedUserId) {
    cachedUserId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  return cachedUserId;
}, "getUserId");
var parseImage = /* @__PURE__ */ __name((imageInfo) => {
  if (!imageInfo || imageInfo.length === 0) return "";
  const portrait = imageInfo.find((img) => img.type === "portrait_large" || img.type === "portrait");
  const fallback = imageInfo.find((img) => img.type === "landscape" || img.type === "bigpic");
  const path = portrait ? portrait.url : fallback ? fallback.url : imageInfo[0].url;
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://qqcdnpictest.mxplay.com/${path}`;
}, "parseImage");
var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    providerContext
  }) {
    var _a, _b, _c;
    try {
      const { axios } = providerContext;
      const url = `https://api.mxplayer.in/v1/web${filter}?pageSize=20&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.mxplayer.in/",
        "Origin": "https://www.mxplayer.in"
      };
      const res = yield axios.get(url, { headers });
      const sections = ((_a = res.data) == null ? void 0 : _a.sections) || ((_c = (_b = res.data) == null ? void 0 : _b.data) == null ? void 0 : _c.sections) || [];
      const postsList = [];
      sections.forEach((sec) => {
        const items = sec.items || [];
        items.forEach((item) => {
          const title = item.title;
          const link = `${item.id}*${item.type}*${item.webUrl || ""}`;
          const image = parseImage(item.imageInfo);
          if (title && item.id) {
            postsList.push({
              title,
              link,
              image
            });
          }
        });
      });
      return postsList;
    } catch (err) {
      console.error("MXPlayer getPosts error:", err);
      return [];
    }
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    providerContext
  }) {
    var _a, _b, _c;
    try {
      const { axios } = providerContext;
      const url = `https://api.mxplayer.in/v1/web/search/resultv2?query=${encodeURIComponent(searchQuery)}&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.mxplayer.in/",
        "Origin": "https://www.mxplayer.in"
      };
      const res = yield axios.post(url, {}, { headers });
      const sections = ((_a = res.data) == null ? void 0 : _a.sections) || ((_c = (_b = res.data) == null ? void 0 : _b.data) == null ? void 0 : _c.sections) || [];
      const postsList = [];
      sections.forEach((sec) => {
        const items = sec.items || [];
        items.forEach((item) => {
          const title = item.title;
          const link = `${item.id}*${item.type}*${item.webUrl || ""}`;
          const image = parseImage(item.imageInfo);
          if (title && item.id) {
            postsList.push({
              title,
              link,
              image
            });
          }
        });
      });
      return postsList;
    } catch (err) {
      console.error("MXPlayer getSearchPosts error:", err);
      return [];
    }
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

