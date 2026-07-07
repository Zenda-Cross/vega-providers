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

// providers/movieBox/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

function extractSubjects(items) {
  var _a;
  const subjects = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of items) {
    if ((item == null ? void 0 : item.type) === "BANNER" && ((_a = item == null ? void 0 : item.banner) == null ? void 0 : _a.banners)) {
      for (const b of item.banner.banners) {
        const s = b == null ? void 0 : b.subject;
        if ((s == null ? void 0 : s.subjectId) && !seen.has(s.subjectId)) {
          seen.add(s.subjectId);
          subjects.push(s);
        }
      }
    }
    if (Array.isArray(item == null ? void 0 : item.subjects)) {
      for (const s of item.subjects) {
        if ((s == null ? void 0 : s.subjectId) && !seen.has(s.subjectId)) {
          seen.add(s.subjectId);
          subjects.push(s);
        }
      }
    }
  }
  return subjects;
}
__name(extractSubjects, "extractSubjects");
var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    signal,
    providerContext
  }) {
    var _a, _b, _c;
    const posts = [];
    const { getBaseUrl } = providerContext;
    if (page > 1) {
      return posts;
    }
    const url = `/wefeed-mobile-bff/tab-operating?page=3&tabId=0&version=2fe0d7c224603ff7b0df294b46d3b84b`;
    const proxyUrl = `https://worker.zendax.me/api/moviebox?url=${encodeURIComponent(url)}`;
    const response = yield fetch(proxyUrl, { signal });
    const data = yield response.json();
    const items = ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.items) || [];
    const subjects = extractSubjects(items);
    for (const item of subjects) {
      if (!(item == null ? void 0 : item.subjectId) || !(item == null ? void 0 : item.title)) continue;
      posts.push({
        image: ((_b = item == null ? void 0 : item.cover) == null ? void 0 : _b.url) || "",
        title: (_c = item == null ? void 0 : item.title) == null ? void 0 : _c.replace(/\s*\[.*?\]\s*$/, ""),
        link: `/wefeed-mobile-bff/subject-api/get?subjectId=${item == null ? void 0 : item.subjectId}`
      });
    }
    return posts;
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    var _a, _b, _c;
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = yield getBaseUrl("movieBox");
    const url = `${baseUrl}/wefeed-mobile-bff/subject-api/search/v2`;
    if (page > 1) {
      return [];
    }
    const response = yield fetch("https://dob-worker.8man.workers.dev", {
      signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        method: "POST",
        body: { page: 1, perPage: 20, keyword: searchQuery, tabId: "Movie" }
      })
    });
    const data = yield response.json();
    const list = ((_c = (_b = (_a = data == null ? void 0 : data.data) == null ? void 0 : _a.results) == null ? void 0 : _b[0]) == null ? void 0 : _c.subjects) || [];
    const posts = list.map((item) => {
      var _a2;
      return {
        image: (_a2 = item == null ? void 0 : item.cover) == null ? void 0 : _a2.url,
        title: item == null ? void 0 : item.title,
        link: `${baseUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${item == null ? void 0 : item.subjectId}`
      };
    });
    return posts;
  });
}, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

