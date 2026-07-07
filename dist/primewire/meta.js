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

// providers/primewire/meta.ts
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
      const baseUrl = link.split("/").slice(0, 3).join("/");
      const res = yield axios.get(url);
      const html = yield res.data;
      const $ = cheerio.load(html);
      const imdbId = ((_a = $(".movie_info").find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])').attr("href")) == null ? void 0 : _a.split("/")[4]) || "";
      const type = $(".show_season").html() ? "series" : "movie";
      const linkList = [];
      $(".show_season").each((i, element) => {
        const seasonTitle = "Season " + $(element).attr("data-id");
        const episodes = [];
        $(element).children().each((i2, element2) => {
          const episodeTitle = $(element2).find("a").children().remove().end().text().trim().replace("E", "Epiosode ");
          const episodeLink = baseUrl + $(element2).find("a").attr("href");
          if (episodeTitle && episodeLink) {
            episodes.push({
              title: episodeTitle,
              link: episodeLink
            });
          }
        });
        linkList.push({
          title: seasonTitle,
          directLinks: episodes
        });
      });
      if (type === "movie") {
        linkList.push({
          title: "Movie",
          directLinks: [
            {
              link,
              title: "Movie",
              type: "movie"
            }
          ]
        });
      }
      return {
        title: "",
        image: "",
        imdbId,
        synopsis: "",
        type,
        linkList
      };
    } catch (error) {
      console.error(error);
      return {
        title: "",
        image: "",
        imdbId: "",
        synopsis: "",
        linkList: [],
        type: "uhd"
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

