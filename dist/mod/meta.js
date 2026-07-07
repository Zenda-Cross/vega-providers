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

// providers/mod/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a;
    try {
      const { axios, cheerio } = providerContext;
      const url = link;
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      const meta = {
        title: $(".imdbwp__title").text() || $("strong:contains('Full Name:')").parent().clone().children().remove().end().text().trim(),
        synopsis: $(".imdbwp__teaser").text() || $(".liTOue").children("p").first().text(),
        image: $(".imdbwp__thumb").find("img").attr("src") || $("span:contains('ScreenShots:')").parent().next("p").children("img").first().attr("src") || "",
        imdbId: ((_a = $(".imdbwp__link").attr("href")) == null ? void 0 : _a.split("/")[4]) || "",
        type: $(".thecontent").text().toLocaleLowerCase().includes("season") ? "series" : "movie"
      };
      const links = [];
      $("h3,h4").map((i, element) => {
        var _a2;
        const seriesTitle = $(element).text();
        const episodesLink = $(element).next("p").find(
          ".maxbutton-episode-links,.maxbutton-g-drive,.maxbutton-af-download"
        ).attr("href");
        const movieLink = $(element).next("p").find(".maxbutton-download-links").attr("href");
        if (movieLink || episodesLink && episodesLink !== "javascript:void(0);") {
          links.push({
            title: seriesTitle.replace("Download ", "").trim() || "Download",
            episodesLink: episodesLink || "",
            directLinks: movieLink ? [{ link: movieLink, title: "Movie", type: "movie" }] : [],
            quality: ((_a2 = seriesTitle == null ? void 0 : seriesTitle.match(/\d+p\b/)) == null ? void 0 : _a2[0]) || ""
          });
        }
      });
      return __spreadProps(__spreadValues({}, meta), { linkList: links });
    } catch (err) {
      console.error(err);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

