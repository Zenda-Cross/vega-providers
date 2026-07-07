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

// providers/drive/posts.ts
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
    const baseUrl = yield getBaseUrl("drive");
    const url = `${baseUrl + filter}page/${page}/`;
    return posts({ url, signal, providerContext });
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
    const baseUrl = yield getBaseUrl("drive");
    const url = buildSearchUrl(baseUrl, searchQuery, page);
    return searchPosts({
      url,
      baseUrl,
      signal
    });
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    url,
    signal,
    providerContext
  }) {
    try {
      console.log("Fetching URL:", url);
      const { cheerio } = providerContext;
      const res = yield fetch(url, { signal });
      const data = yield res.text();
      const $ = cheerio.load(data);
      const catalog = [];
      $(".poster-card").map((i, element) => {
        const title = $(element).find(".poster-title").text();
        const link = $(element).parent().attr("href");
        const image = $(element).find(".poster-image img").attr("src");
        if (title && link && image) {
          catalog.push({
            title: title.replace("Download", "").trim(),
            link,
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("drive error ", err);
      return [];
    }
  });
}
__name(posts, "posts");
function searchPosts(_0) {
  return __async(this, arguments, function* ({
    url,
    baseUrl,
    signal
  }) {
    var _a, _b;
    try {
      console.log("Fetching drive search URL:", url);
      const res = yield fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`drive search failed with status ${res.status}`);
      }
      const data = yield res.json();
      return (_b = (_a = data.hits) == null ? void 0 : _a.map((hit) => {
        var _a2;
        const document = hit.document;
        const title = (_a2 = document == null ? void 0 : document.post_title) == null ? void 0 : _a2.trim();
        const link = (document == null ? void 0 : document.permalink) ? normalizeUrl(baseUrl, document.permalink) : "";
        const image = (document == null ? void 0 : document.post_thumbnail) ? normalizeUrl(baseUrl, document.post_thumbnail) : "";
        if (!title || !link || !image) {
          return null;
        }
        return {
          title,
          link,
          image
        };
      }).filter((post) => post !== null)) != null ? _b : [];
    } catch (err) {
      console.error("drive search error ", err);
      return [];
    }
  });
}
__name(searchPosts, "searchPosts");
function buildSearchUrl(baseUrl, searchQuery, page) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${trimTrailingSlash(baseUrl)}/search.php${separator}q=${encodeURIComponent(
    searchQuery
  )}&page=${page}`;
}
__name(buildSearchUrl, "buildSearchUrl");
function normalizeUrl(baseUrl, value) {
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  if (value.startsWith("/")) {
    return `${trimTrailingSlash(baseUrl)}${value}`;
  }
  return `${trimTrailingSlash(baseUrl)}/${trimLeadingSlash(value)}`;
}
__name(normalizeUrl, "normalizeUrl");
function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
__name(trimTrailingSlash, "trimTrailingSlash");
function trimLeadingSlash(value) {
  return value.replace(/^\/+/, "");
}
__name(trimLeadingSlash, "trimLeadingSlash");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

