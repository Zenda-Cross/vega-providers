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

// providers/rareanimes/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});


// providers/getBaseUrl.ts
var urlsEndpoint = "https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/urls.json";
var cacheTtl = 60 * 60 * 1e3;
function getCache() {
  var _a;
  const state = typeof providerGlobal !== "undefined" && providerGlobal ? providerGlobal : globalThis;
  (_a = state.__vegaProviderBaseUrlCache__) != null ? _a : state.__vegaProviderBaseUrlCache__ = { expiresAt: 0 };
  return state.__vegaProviderBaseUrlCache__;
}
__name(getCache, "getCache");
function fetchProviderUrls() {
  return __async(this, null, function* () {
    const cache = getCache();
    if (cache.data && Date.now() < cache.expiresAt) {
      return cache.data;
    }
    if (cache.request) {
      return cache.request;
    }
    const request = fetch(urlsEndpoint).then((response) => __async(null, null, function* () {
      if (!response.ok) {
        throw new Error(`URL configuration request failed: ${response.status}`);
      }
      const data = yield response.json();
      console.log("Fetched provider URL configuration");
      cache.data = data;
      cache.expiresAt = Date.now() + cacheTtl;
      return data;
    })).catch((error) => {
      if (cache.data) {
        console.warn("Using stale provider URL configuration", error);
        return cache.data;
      }
      throw error;
    }).finally(() => {
      cache.request = void 0;
    });
    Object.defineProperty(cache, "request", {
      configurable: true,
      enumerable: false,
      value: request,
      writable: true
    });
    return request;
  });
}
__name(fetchProviderUrls, "fetchProviderUrls");
var getBaseUrl = /* @__PURE__ */ __name((providerValue) => __async(null, null, function* () {
  var _a, _b;
  try {
    const providerUrls = yield fetchProviderUrls();
    return (_b = (_a = providerUrls[providerValue]) == null ? void 0 : _a.url) != null ? _b : "";
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    throw error;
  }
}), "getBaseUrl");

// providers/providerErrors.ts
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}
__name(getErrorMessage, "getErrorMessage");
function throwProviderError(provider, operation, error) {
  var _a, _b;
  const response = error == null ? void 0 : error.response;
  const status = response == null ? void 0 : response.status;
  const statusText = response == null ? void 0 : response.statusText;
  const url = ((_a = response == null ? void 0 : response.config) == null ? void 0 : _a.url) || ((_b = error == null ? void 0 : error.config) == null ? void 0 : _b.url);
  const details = [
    status ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}` : "",
    url ? `URL ${url}` : "",
    getErrorMessage(error)
  ].filter(Boolean);
  throw new Error(`${provider} ${operation} failed: ${details.join(" | ")}`);
}
__name(throwProviderError, "throwProviderError");

// providers/rareanimes/posts.ts
var defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache"
};
var CARD_ASPECT_RATIO = 16 / 9;
var CARD_BORDER_RADIUS = 8;
var CATEGORY_TAG_MAP = {
  "category-hindi-dub": "HINDI DUB",
  "category-tamil": "TAMIL",
  "category-telugu": "TELUGU",
  "category-animes": "ANIME",
  "category-anime": "ANIME",
  "category-movies": "MOVIE",
  "category-movie": "MOVIE",
  "category-crunchyroll": "CRUNCHYROLL",
  "category-amazon-prime-original": "PRIME",
  "category-completed": "COMPLETED",
  "category-ongoing": "ONGOING"
};
function getPosts(_0) {
  return __async(this, arguments, function* ({
    filter,
    page = 1,
    signal,
    providerContext
  }) {
    const baseUrl = yield getBaseUrl("RareAnimes");
    return fetchPosts({
      filter,
      page,
      query: "",
      baseUrl,
      operation: "posts",
      signal,
      providerContext
    });
  });
}
__name(getPosts, "getPosts");
function getSearchPosts(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page = 1,
    signal,
    providerContext
  }) {
    const baseUrl = yield getBaseUrl("RareAnimes");
    return fetchPosts({
      filter: "",
      page,
      query: searchQuery,
      baseUrl,
      operation: "search posts",
      signal,
      providerContext
    });
  });
}
__name(getSearchPosts, "getSearchPosts");
function fetchPosts(_0) {
  return __async(this, arguments, function* ({
    filter,
    query,
    page = 1,
    baseUrl,
    operation,
    signal,
    providerContext
  }) {
    try {
      let url;
      if (query && query.trim()) {
        const search = encodeURIComponent(query.trim());
        url = page > 1 ? `${baseUrl}/page/${page}/?s=${search}` : `${baseUrl}/?s=${search}`;
      } else if (filter) {
        const cleanFilter = filter.replace(/^\/+|\/+$/g, "");
        url = `${baseUrl}/${cleanFilter}${page > 1 ? `/page/${page}` : ""}/`;
      } else {
        url = page > 1 ? `${baseUrl}/page/${page}/` : `${baseUrl}/`;
      }
      console.log("rareAnimes fetchPosts url:", url);
      const { axios, cheerio } = providerContext;
      const res = yield axios.get(url, {
        headers: defaultHeaders,
        signal
      });
      const $ = cheerio.load(res.data || "");
      const resolveUrl = /* @__PURE__ */ __name((href) => (href == null ? void 0 : href.startsWith("http")) ? href : new URL(href, baseUrl).href, "resolveUrl");
      const seen = /* @__PURE__ */ new Set();
      const catalog = [];
      const POST_SELECTORS = [
        "article.herald-post",
        ".herald-posts article.herald-post",
        "article.herald-lay-b.herald-post",
        "article.herald-lay-b",
        ".herald-posts article.herald-lay-b",
        "li.post",
        ".swiper-slide li",
        ".latest-movies-series-swiper-slide li",
        "ul.post-lst li"
      ].join(",");
      $(POST_SELECTORS).each((_, el) => {
        var _a, _b;
        const article = $(el);
        let link = article.find("h2.entry-title a[href]").first().attr("href") || article.find("a.herald-read-more[href]").first().attr("href") || article.find("a[href]").first().attr("href") || "";
        if (!link) return;
        link = resolveUrl(link);
        if (seen.has(link)) return;
        const rawTitle = article.find("h2.entry-title").first().text().trim() || ((_a = article.find("img").attr("alt")) == null ? void 0 : _a.trim()) || ((_b = article.find("a.herald-read-more").attr("title")) == null ? void 0 : _b.trim()) || "";
        if (!rawTitle) return;
        const title = rawTitle.replace(/^Image\s+/i, "").trim();
        const img = article.find("img").attr("data-src") || article.find("img").attr("data-lazy-src") || article.find("img").attr("src") || "";
        const image = img ? resolveUrl(img) : "";
        const classes = article.attr("class") || "";
        let tag;
        for (const cls of Object.keys(CATEGORY_TAG_MAP)) {
          if (classes.includes(cls)) {
            tag = CATEGORY_TAG_MAP[cls];
            break;
          }
        }
        let cornerTag;
        const seasonMatch = title.match(/Season\s*(\d+)/i);
        if (seasonMatch) {
          cornerTag = `S${seasonMatch[1]}`;
        }
        if (!cornerTag && classes.includes("sticky")) {
          cornerTag = "NEW";
        }
        seen.add(link);
        catalog.push({
          title,
          link,
          image,
          aspectRatio: CARD_ASPECT_RATIO,
          borderRadius: CARD_BORDER_RADIUS,
          tag,
          cornerTag
        });
      });
      return catalog.slice(0, 100);
    } catch (err) {
      throwProviderError("RareAnimes", operation, err);
    }
  });
}
__name(fetchPosts, "fetchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

