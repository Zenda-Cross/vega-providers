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

// providers/genga/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  search: () => search
});

var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    providerContext
  }) {
    var _a, _b;
    try {
      const { axios, cheerio } = providerContext;
      const url = "https://www.desidubanime.me/wp-admin/admin-ajax.php";
      const genresList = ["action", "comedy", "adventure", "isekai"];
      const params = new URLSearchParams();
      params.append("action", "advanced_search");
      params.append("page", String(page));
      if (genresList.includes(filter)) {
        params.append("genre[]", filter);
        params.append("orderby", "date");
      } else {
        params.append("orderby", filter || "date");
      }
      params.append("order", "DESC");
      params.append("s_keyword", "");
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.desidubanime.me/search/",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const res = yield axios.post(url, params.toString(), { headers });
      const html = ((_b = (_a = res.data) == null ? void 0 : _a.data) == null ? void 0 : _b.html) || "";
      if (!html) return [];
      const $ = cheerio.load(html);
      const postsList = [];
      $("article.anime-card").each((_, el) => {
        const imgEl = $(el).find("img").first();
        const title = imgEl.attr("alt") || "";
        const image = imgEl.attr("src") || "";
        const link = $(el).find("a").first().attr("href") || "";
        if (title && link) {
          postsList.push({
            title: title.trim(),
            link: link.trim(),
            image: image.trim()
          });
        }
      });
      return postsList;
    } catch (err) {
      console.error("DesiDubAnime getPosts error:", err);
      return [];
    }
  });
}, "getPosts");
var search = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    providerContext
  }) {
    var _a, _b;
    try {
      const { axios, cheerio } = providerContext;
      const url = "https://www.desidubanime.me/wp-admin/admin-ajax.php";
      const params = new URLSearchParams();
      params.append("action", "advanced_search");
      params.append("page", String(page));
      params.append("orderby", "date");
      params.append("order", "DESC");
      params.append("s_keyword", searchQuery);
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.desidubanime.me/search/",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const res = yield axios.post(url, params.toString(), { headers });
      const html = ((_b = (_a = res.data) == null ? void 0 : _a.data) == null ? void 0 : _b.html) || "";
      if (!html) return [];
      const $ = cheerio.load(html);
      const postsList = [];
      $("article.anime-card").each((_, el) => {
        const imgEl = $(el).find("img").first();
        const title = imgEl.attr("alt") || "";
        const image = imgEl.attr("src") || "";
        const link = $(el).find("a").first().attr("href") || "";
        if (title && link) {
          postsList.push({
            title: title.trim(),
            link: link.trim(),
            image: image.trim()
          });
        }
      });
      return postsList;
    } catch (err) {
      console.error("DesiDubAnime search error:", err);
      return [];
    }
  });
}, "search");
exports.getPosts = getPosts;
exports.search = search;
// Annotate the CommonJS export names for ESM import in node:

