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

// providers/kissKh/posts.ts
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
    var _a;
    const { getBaseUrl, axios } = providerContext;
    const baseUrl = yield getBaseUrl("kissKh");
    const url = `${baseUrl + filter}&type=0`;
    try {
      const res = yield axios.get(url, { signal });
      const data = (_a = res.data) == null ? void 0 : _a.data;
      const catalog = [];
      data == null ? void 0 : data.map((element) => {
        const title = element.title;
        const link = baseUrl + `/api/DramaList/Drama/${element == null ? void 0 : element.id}?isq=false`;
        const image = element.thumbnail;
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
      console.error("kiss error ", err);
      return [];
    }
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    signal,
    providerContext
  }) {
    const { getBaseUrl, axios } = providerContext;
    const baseUrl = yield getBaseUrl("kissKh");
    const url = `${baseUrl}/api/DramaList/Search?q=${searchQuery}&type=0`;
    try {
      const res = yield axios.get(url, { signal });
      const data = res.data;
      const catalog = [];
      data == null ? void 0 : data.map((element) => {
        const title = element.title;
        const link = baseUrl + `/api/DramaList/Drama/${element == null ? void 0 : element.id}?isq=false`;
        const image = element.thumbnail;
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
      console.error("kiss error ", err);
      return [];
    }
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

