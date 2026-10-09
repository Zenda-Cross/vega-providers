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

// providers/multi/posts.ts
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

// providers/multi/posts.ts
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1"
};
function resolveUrl(href, baseUrl) {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  try {
    return new URL(href, baseUrl).href;
  } catch (e) {
    return "";
  }
}
__name(resolveUrl, "resolveUrl");
function getPosterSrc(imgElement) {
  if (!imgElement || !imgElement.length) return "";
  const src = imgElement.attr("src") || imgElement.attr("data-src") || imgElement.attr("data-lazy-src") || "";
  return String(src).trim();
}
__name(getPosterSrc, "getPosterSrc");
function isContentLink(link) {
  if (!link) return false;
  if (link.includes("#")) return false;
  if (link.includes("/genre/")) return false;
  if (link.includes("/category/")) return false;
  if (link.includes("/tag/")) return false;
  if (link.includes("/provider/")) return false;
  if (link.includes("/collection/")) return false;
  if (link.includes("/watchlist")) return false;
  if (link.includes("/contact")) return false;
  if (link.includes("/dmca")) return false;
  if (link.includes("/privacy")) return false;
  return true;
}
__name(isContentLink, "isContentLink");
function normaliseTitle(t) {
  return String(t || "").replace(/\s+/g, " ").replace("Download", "").trim();
}
__name(normaliseTitle, "normaliseTitle");
function getPosts(_0) {
  return __async(this, arguments, function* ({
    filter,
    page = 1,
    signal,
    providerValue,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = (yield getBaseUrl("multi")).replace(/\/+$/, "");
    const route = (filter || "trending").replace(/^\/+/, "").replace(/\/+$/, "");
    const url = page > 1 ? `${baseUrl}/${route}/page/${page}/` : `${baseUrl}/${route}`;
    console.log(`[MultiMovies] Fetching: ${url}`);
    try {
      const res = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: baseUrl }),
        signal,
        timeout: 15e3,
        maxRedirects: 5
      });
      const $ = cheerio.load(res.data);
      const posts = [];
      $("article.poster-card").each((_, element) => {
        const card = $(element);
        const linkA = card.find("a.poster-art").first();
        const captionA = card.find(".poster-caption a").first();
        const rawHref = linkA.attr("href") || captionA.attr("href");
        if (!rawHref || !isContentLink(rawHref)) return;
        const link = resolveUrl(rawHref, baseUrl);
        if (!link || posts.some((p) => p.link === link)) return;
        const img = card.find("img").first();
        const title = normaliseTitle(
          captionA.text() || img.attr("alt") || ""
        );
        if (!title) return;
        const image = resolveUrl(getPosterSrc(img), baseUrl);
        posts.push({ title, link, image });
      });
      if (posts.length === 0) {
        console.log("[MultiMovies] No poster-card found, trying hero slides...");
        $("article.cinema-slide").each((_, element) => {
          const slide = $(element);
          const linkA = slide.find("a.button-light, a.button-glass").first();
          const rawHref = linkA.attr("href");
          if (!rawHref || !isContentLink(rawHref)) return;
          const link = resolveUrl(rawHref, baseUrl);
          if (!link || posts.some((p) => p.link === link)) return;
          const img = slide.find("img.cinema-backdrop").first();
          const title = normaliseTitle(
            slide.find("h1").first().text() || img.attr("alt") || ""
          );
          if (!title) return;
          const image = resolveUrl(getPosterSrc(img), baseUrl);
          posts.push({ title, link, image });
        });
      }
      if (posts.length === 0) {
        console.log("[MultiMovies] Trying generic fallback selector...");
        $("article, .poster-card, .item").each((_, element) => {
          const card = $(element);
          const rawHref = card.find("a[href]").first().attr("href");
          if (!rawHref || !isContentLink(rawHref)) return;
          const link = resolveUrl(rawHref, baseUrl);
          if (!link || posts.some((p) => p.link === link)) return;
          const img = card.find("img").first();
          const title = normaliseTitle(
            card.find("h1, h2, h3, .poster-caption a").first().text() || img.attr("alt") || ""
          );
          if (!title) return;
          const image = resolveUrl(getPosterSrc(img), baseUrl);
          posts.push({ title, link, image });
        });
      }
      console.log(`[MultiMovies] Found ${posts.length} posts for ${route}`);
      return posts.slice(0, 100);
    } catch (error) {
      throwProviderError("MultiMovies", "posts", error);
    }
  });
}
__name(getPosts, "getPosts");
function getSearchPosts(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page = 1,
    signal,
    providerValue,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = (yield getBaseUrl("multimovies")).replace(/\/+$/, "");
    const url = `${baseUrl}/search?q=${encodeURIComponent(searchQuery)}`;
    console.log(`[MultiMovies] Searching: ${url}`);
    try {
      const res = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: baseUrl }),
        signal,
        timeout: 15e3,
        maxRedirects: 5
      });
      const $ = cheerio.load(res.data);
      const posts = [];
      $("article.poster-card").each((_, element) => {
        const card = $(element);
        const linkA = card.find("a.poster-art").first();
        const captionA = card.find(".poster-caption a").first();
        const rawHref = linkA.attr("href") || captionA.attr("href");
        if (!rawHref || !isContentLink(rawHref)) return;
        const link = resolveUrl(rawHref, baseUrl);
        if (!link || posts.some((p) => p.link === link)) return;
        const img = card.find("img").first();
        const title = normaliseTitle(
          captionA.text() || img.attr("alt") || ""
        );
        if (!title) return;
        const image = resolveUrl(getPosterSrc(img), baseUrl);
        posts.push({ title, link, image });
      });
      if (posts.length === 0) {
        console.log("[MultiMovies] No poster-card in search, trying fallback...");
        $("article, .result-item, .item").each((_, element) => {
          const card = $(element);
          const rawHref = card.find("a[href]").first().attr("href");
          if (!rawHref || !isContentLink(rawHref)) return;
          const link = resolveUrl(rawHref, baseUrl);
          if (!link || posts.some((p) => p.link === link)) return;
          const img = card.find("img").first();
          const title = normaliseTitle(
            card.find("h1, h2, h3, .poster-caption a, .title a").first().text() || img.attr("alt") || ""
          );
          if (!title) return;
          const image = resolveUrl(getPosterSrc(img), baseUrl);
          posts.push({ title, link, image });
        });
      }
      console.log(
        `[MultiMovies] Search found ${posts.length} results for "${searchQuery}"`
      );
      return posts.slice(0, 100);
    } catch (error) {
      throwProviderError("MultiMovies", "search posts", error);
    }
  });
}
__name(getSearchPosts, "getSearchPosts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

