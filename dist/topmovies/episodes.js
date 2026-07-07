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

// providers/topmovies/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    var _a;
    const { axios, cheerio } = providerContext;
    try {
      if (url.includes("url=")) {
        url = atob(url.split("url=")[1]);
      }
      const res = yield axios.get(url);
      const html = res.data;
      let $ = cheerio.load(html);
      if (url.includes("url=")) {
        const newUrl = (_a = $("meta[http-equiv='refresh']").attr("content")) == null ? void 0 : _a.split("url=")[1];
        const res2 = yield axios.get(newUrl || url);
        const html2 = res2.data;
        $ = cheerio.load(html2);
      }
      const episodeLinks = [];
      $("h3,h4").map((i, element) => {
        const seriesTitle = $(element).text();
        const episodesLink = $(element).find("a").attr("href");
        if (episodesLink && episodesLink !== "#") {
          episodeLinks.push({
            title: seriesTitle.trim() || "No title found",
            link: episodesLink || ""
          });
        }
      });
      $("a.maxbutton").map((i, element) => {
        const seriesTitle = $(element).children("span").text();
        const episodesLink = $(element).attr("href");
        if (episodesLink && episodesLink !== "#") {
          episodeLinks.push({
            title: seriesTitle.trim() || "No title found",
            link: episodesLink || ""
          });
        }
      });
      return episodeLinks;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

