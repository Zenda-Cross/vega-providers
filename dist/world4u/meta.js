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

// providers/world4u/meta.ts
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
      const type = $(".entry-content").text().toLocaleLowerCase().includes("movie name") ? "movie" : "series";
      const imdbId = ((_a = $(".imdb_left").find("a").attr("href")) == null ? void 0 : _a.split("/")[4]) || "";
      const title = $(".entry-content").find('strong:contains("Name")').children().remove().end().text().replace(":", "");
      const synopsis = $(".entry-content").find('p:contains("Synopsis"),p:contains("Plot"),p:contains("Story")').children().remove().end().text();
      const image = $(".wp-caption").find("img").attr("data-src") || $(".entry-content").find("img").attr("data-src") || "";
      const links = [];
      $(".my-button").map((i, element) => {
        var _a2;
        const title2 = $(element).parent().parent().prev().text();
        const episodesLink = $(element).attr("href");
        const quality = ((_a2 = title2.match(/\b(480p|720p|1080p|2160p)\b/i)) == null ? void 0 : _a2[0]) || "";
        if (episodesLink && title2) {
          links.push({
            title: title2,
            episodesLink: type === "series" ? episodesLink : "",
            directLinks: type === "movie" ? [
              {
                link: episodesLink,
                title: title2,
                type: "movie"
              }
            ] : [],
            quality
          });
        }
      });
      return {
        title,
        synopsis,
        image,
        imdbId,
        type,
        linkList: links
      };
    } catch (err) {
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

