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

// providers/luxMovies/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie: "_ga=GA1.1.10613951.1756380104; xla=s4t; _ga_1CG5NQ0F53=GS2.1.s1756380103$o1$g1$t1756380120$j43$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"
};
var getPosts = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  filter,
  page,
  providerValue,
  signal,
  providerContext
}) {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = yield getBaseUrl("lux");
  console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
  const url = `${baseUrl}/${filter}/page/${page}/`;
  console.log("vegaGetPosts url:", url);
  return posts(baseUrl, url, signal, headers, axios, cheerio);
}), "getPosts");
var getSearchPosts = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext
}) {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = yield getBaseUrl("lux");
  console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
  const url = `${baseUrl}/search.php?q=${searchQuery}&page=${page}`;
  console.log("vegaGetPosts url:", url);
  try {
    const response = yield axios.get(url, {
      headers: __spreadProps(__spreadValues({}, headers), {
        Referer: baseUrl
      }),
      signal
    });
    const data = response.data;
    const posts2 = [];
    if (data == null ? void 0 : data.hits) {
      data.hits.forEach((hit) => {
        const doc = hit.document;
        const post = {
          title: doc.post_title.replace("Download", "").trim(),
          link: doc.permalink.startsWith("http") ? doc.permalink : `${baseUrl}${doc.permalink}`,
          image: doc.post_thumbnail
        };
        posts2.push(post);
      });
    }
    return posts2;
  } catch (error) {
    console.error("vegaGetSearchPosts error:", error);
    return [];
  }
}), "getSearchPosts");
function posts(_0, _1, _2) {
  return __async(this, arguments, function* (baseUrl, url, signal, headers2 = {}, axios, cheerio) {
    var _a, _b;
    try {
      const urlRes = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, headers2), {
          Referer: baseUrl
        }),
        signal
      });
      const $ = cheerio.load(yield urlRes.text());
      const posts2 = [];
      (_b = (_a = $(".blog-items,.post-list,#archive-container,.movies-grid")) == null ? void 0 : _a.children("article,.entry-list-item,a")) == null ? void 0 : _b.each((index, element) => {
        var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
        const post = {
          title: (((_e = (_d = (_c = (_b2 = (_a2 = $(element)) == null ? void 0 : _a2.find(".entry-title,.poster-title")) == null ? void 0 : _b2.text()) == null ? void 0 : _c.replace("Download", "")) == null ? void 0 : _d.match(/^(.*?)\s*\((\d{4})\)|^(.*?)\s*\((Season \d+)\)/)) == null ? void 0 : _e[0]) || ((_h = (_g = (_f = $(element)) == null ? void 0 : _f.find("a")) == null ? void 0 : _g.attr("title")) == null ? void 0 : _h.replace("Download", "")) || ((_j = (_i = $(element)) == null ? void 0 : _i.find(".post-title,.poster-title").text()) == null ? void 0 : _j.replace("Download", "")) || "").trim(),
          link: ((_l = (_k = $(element)) == null ? void 0 : _k.find("a")) == null ? void 0 : _l.attr("href")) || ((_m = $(element)) == null ? void 0 : _m.attr("href")) || "",
          image: $(element).find("a").find("img").attr("data-lazy-src") || $(element).find("a").find("img").attr("data-src") || $(element).find("a").find("img").attr("src") || $(element).find("img").attr("data-src") || $(element).find("img").attr("src") || ""
        };
        if (post.image.startsWith("//")) {
          post.image = "https:" + post.image;
        }
        console.log("vegaGetPosts post:", post);
        posts2.push(post);
      });
      return posts2;
    } catch (error) {
      console.error("vegaGetPosts error:", error);
      return [];
    }
  });
}
__name(posts, "posts");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

