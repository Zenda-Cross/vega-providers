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

// providers/kmMovies/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var kmmHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache"
};
function getWithWAF(url, axios, openWebView, headers) {
  return __async(this, null, function* () {
    var _a;
    const baseUrl = url.split("/").slice(0, 3).join("/");
    try {
      return yield axios.get(url, { headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }) });
    } catch (error) {
      if (((_a = error.response) == null ? void 0 : _a.status) === 403 && openWebView) {
        console.log(`WAF detected (403) for ${url}, using solver...`);
        const wafResult = yield openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass anti-bot protection.",
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }),
          waitForCookie: "cf_clearance"
        });
        return yield axios.get(url, {
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl, Cookie: wafResult.cookie })
        });
      }
      throw error;
    }
  });
}
__name(getWithWAF, "getWithWAF");
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b;
    try {
      const { axios, cheerio, openWebView } = providerContext;
      if (!link.startsWith("http")) {
        const baseUrl = yield providerContext.getBaseUrl("kmmovies");
        link = `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
      }
      const res = yield getWithWAF(link, axios, openWebView, kmmHeaders);
      const $ = cheerio.load(res.data);
      const title = $("h1, h2, .animated-text").first().text().trim() || ((_a = $("meta[property='og:title']").attr("content")) == null ? void 0 : _a.trim()) || $("title").text().trim() || "Unknown";
      let image = $("div.wp-slider-container img").first().attr("src") || $("meta[property='og:image']").attr("content") || $("meta[name='twitter:image']").attr("content") || "";
      if (!image || !image.startsWith("http")) {
        image = new URL(image || "/placeholder.png", link).href;
      }
      let synopsis = "";
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 40 && !text.toLowerCase().includes("download") && !text.toLowerCase().includes("quality")) {
          synopsis = text;
          return false;
        }
      });
      if (!synopsis) {
        synopsis = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
      }
      const tags = [];
      if (res.data.toLowerCase().includes("action")) tags.push("Action");
      if (res.data.toLowerCase().includes("drama")) tags.push("Drama");
      if (res.data.toLowerCase().includes("romance")) tags.push("Romance");
      if (res.data.toLowerCase().includes("thriller")) tags.push("Thriller");
      const cast = [];
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (/starring|cast/i.test(text)) {
          text.split(",").forEach((name) => cast.push(name.trim()));
        }
      });
      let rating = ((_b = $("p").text().match(/IMDb Rating[:\s]*([0-9.]+)/i)) == null ? void 0 : _b[1]) || "";
      if (rating && !rating.includes("/")) rating = rating + "/10";
      const imdbLink = $("p a[href*='imdb.com']").attr("href") || "";
      const imdbId = imdbLink && imdbLink.includes("/tt") ? "tt" + imdbLink.split("/tt")[1].split("/")[0] : "";
      const linkList = [];
      $("a.dl-btn").each((_, a) => {
        const el = $(a);
        const text = el.text().trim();
        const titleText = text.replace(/\s+/g, " ").trim();
        let quality = "AUTO";
        if (titleText.toLowerCase().includes("480p")) quality = "480p";
        else if (titleText.toLowerCase().includes("720p")) quality = "720p";
        else if (titleText.toLowerCase().includes("1080p")) quality = "1080p";
        else if (titleText.toLowerCase().includes("2160p") || titleText.toLowerCase().includes("4k")) quality = "2160p";
        const href = el.attr("href") || "";
        if (href) {
          linkList.push({
            title: `Download ${titleText}`,
            quality,
            directLinks: [
              {
                link: href,
                title: `Download ${titleText}`,
                type: href.includes("/series/") ? "series" : "movie"
              }
            ]
          });
        }
      });
      return {
        title,
        synopsis,
        image,
        imdbId,
        type: linkList.some((l) => l.directLinks && l.directLinks.some((dl) => dl.type === "series")) ? "series" : "movie",
        tags,
        cast,
        rating,
        linkList
      };
    } catch (err) {
      console.error("KMMOVIES getMeta error:", err);
      return {
        title: "",
        synopsis: "",
        image: "https://via.placeholder.com/300x450",
        imdbId: "",
        type: "movie",
        tags: [],
        cast: [],
        rating: "",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

