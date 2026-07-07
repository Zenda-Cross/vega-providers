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

// providers/1cinevood/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

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
          waitForCookie: "cf_clearance",
          force: true
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
    var _a;
    const { axios, cheerio, commonHeaders, openWebView } = providerContext;
    const url = link;
    const baseUrl = url.split("/").slice(0, 3).join("/");
    const emptyResult = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: []
    };
    try {
      const response = yield getWithWAF(url, axios, openWebView, commonHeaders);
      const $ = cheerio.load(response.data);
      const infoContainer = $(".entry-content, .post-inner").first();
      const result = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
      const downloadTitleMatch = infoContainer.find("h6 span").first().text().match(/(.*)\s*\(\d{4}\)/);
      if (downloadTitleMatch) {
        result.title = downloadTitleMatch[1].trim();
      }
      if (!result.title || result.title === "Unknown Title") {
        const rawTitle = $("#movie_title a").text().trim();
        result.title = rawTitle.replace(/<small>.*<\/small>/, "").trim() || "Unknown Title";
      }
      const firstDownloadHeadingText = infoContainer.find("h6").first().text();
      const isSeries = firstDownloadHeadingText.includes("S01") || firstDownloadHeadingText.includes("E01") || firstDownloadHeadingText.toLowerCase().includes("season");
      result.type = isSeries ? "series" : "movie";
      const imdbMatch = (_a = $("#movie_title a").attr("href")) == null ? void 0 : _a.match(/tt\d+/);
      result.imdbId = imdbMatch ? imdbMatch[0] : "";
      let image = infoContainer.find('img[decoding="async"]').first().attr("src") || "";
      if (image.startsWith("//")) image = "https:" + image;
      result.image = image;
      result.synopsis = infoContainer.find("#summary b:contains('Summary:')").parent().text().replace("Summary:", "").trim() || "";
      const links = [];
      const qualityBlocks = infoContainer.find("h6").filter((_, el) => {
        return !$(el).text().includes("Watch Online");
      });
      qualityBlocks.each((index, element) => {
        var _a2, _b;
        const el = $(element);
        const fullTitle = el.text().trim();
        const qualityMatch = ((_a2 = fullTitle.match(/\d{3,4}p\b/)) == null ? void 0 : _a2[0]) || "";
        const fileSizeMatch = ((_b = fullTitle.match(/\[([^\]]+)\](?=[^\[]*$)/)) == null ? void 0 : _b[1]) || "";
        const nextSiblings = el.nextUntil("h6, hr");
        nextSiblings.find("a").add(nextSiblings.filter("a")).each((i, btn) => {
          const btnEl = $(btn);
          const link2 = btnEl.attr("href");
          const seMatch = fullTitle.match(/(S\d{2}E\d{2}|S\d{2}|E\d{2})/);
          const seasonEpisode = seMatch ? `${seMatch[0]} | ` : "";
          links.push({
            // Final title for the link entry (e.g., S01 | 1080p | 11.78 GB)
            title: `${seasonEpisode}${qualityMatch}${fileSizeMatch ? " | " + fileSizeMatch : ""}`.trim().replace(/\|$/, "").trim(),
            quality: qualityMatch,
            episodesLink: result.type === "series" ? link2 : "",
            directLinks: result.type === "movie" ? [{ link: link2 || "", title: "Movie", type: "movie" }] : void 0
          });
        });
      });
      result.linkList = links;
      return result;
    } catch (err) {
      console.log("getMeta error:", err);
      return emptyResult;
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

