"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// providers/animetsu/posts.ts
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
    if (page > 1) {
      return [];
    }
    const { axios, commonHeaders } = providerContext;
    const baseUrl = "https://animetsu.net";
    const url = `${baseUrl}/v2/api/anime/home`;
    return posts({
      url,
      filter,
      signal,
      axios,
      providerContext,
      headers: commonHeaders
    });
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    const { axios, commonHeaders } = providerContext;
    const baseUrl = "https://animetsu.net";
    const url = `${baseUrl}/v2/api/anime/search/?query=${encodeURIComponent(
      searchQuery
    )}`;
    return posts({ url, signal, axios, providerContext, headers: commonHeaders });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    url,
    filter,
    signal,
    axios,
    providerContext,
    headers
  }) {
    var _a, _b, _c;
    const baseUrl = "https://animetsu.net";
    const { openWebView } = providerContext;
    try {
      let cookies;
      let res;
      try {
        res = yield axios.get(url, {
          signal,
          headers: __spreadProps(__spreadValues({}, headers), {
            Referer: baseUrl
          })
        });
      } catch (error) {
        if (((_a = error.response) == null ? void 0 : _a.status) === 403) {
          const wafResult = yield openWebView(baseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass Animetsu anti-bot protection.",
            headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }),
            force: true,
            waitForCookie: "cf_clearance"
          });
          cookies = wafResult.cookies;
          res = yield axios.get(url, {
            signal,
            headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl, Cookie: cookies })
          });
        } else {
          throw error;
        }
      }
      const data = filter ? (_b = res.data) == null ? void 0 : _b[filter] : ((_c = res.data) == null ? void 0 : _c.results) || res.data;
      const catalog = [];
      data == null ? void 0 : data.map((element) => {
        var _a2, _b2, _c2, _d, _e, _f, _g, _h, _i, _j, _k;
        const title = ((_a2 = element.title) == null ? void 0 : _a2.english) || ((_b2 = element.title) == null ? void 0 : _b2.romaji) || ((_c2 = element.title) == null ? void 0 : _c2.native);
        const link = (_d = element.id) == null ? void 0 : _d.toString();
        const image = ((_e = element.cover_image) == null ? void 0 : _e.large) || ((_f = element.cover_image) == null ? void 0 : _f.extraLarge) || ((_g = element.cover_image) == null ? void 0 : _g.medium) || ((_h = element.cover_image) == null ? void 0 : _h.small) || ((_i = element.coverImage) == null ? void 0 : _i.large) || ((_j = element.coverImage) == null ? void 0 : _j.extraLarge) || ((_k = element.coverImage) == null ? void 0 : _k.medium);
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
      console.error("animetsu error ", err);
      return [];
    }
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

