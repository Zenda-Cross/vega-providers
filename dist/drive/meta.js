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

// providers/drive/meta.ts
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
      const type = $(".left-wrapper").text().toLocaleLowerCase().includes("movie name") ? "movie" : "series";
      const imdbId = ((_a = $('a:contains("IMDb")').attr("href")) == null ? void 0 : _a.split("/")[4]) || "";
      const title = $(".left-wrapper").find('strong:contains("Name")').next().text() || $(".left-wrapper").find('strong:contains("Name"),h5:contains("Name")').find("span:first").text();
      const synopsis = $(".left-wrapper").find(
        'h2:contains("Storyline"),h3:contains("Storyline"),h5:contains("Storyline"),h4:contains("Storyline"),h4:contains("STORYLINE")'
      ).next().text() || $(".ipc-html-content-inner-div").text() || "";
      const image = $("img.entered.lazyloaded,img.entered,img.litespeed-loaded").attr(
        "src"
      ) || $("img.aligncenter").attr("src") || "";
      const links = [];
      $(
        'a:contains("1080")a:not(:contains("Zip")),a:contains("720")a:not(:contains("Zip")),a:contains("480")a:not(:contains("Zip")),a:contains("2160")a:not(:contains("Zip")),a:contains("4k")a:not(:contains("Zip"))'
      ).map((i, element) => {
        var _a2;
        let linkTitle = $(element).parent("h5").prev().text();
        const episodesLink = $(element).attr("href");
        const quality = ((_a2 = linkTitle.match(/\b(480p|720p|1080p|2160p)\b/i)) == null ? void 0 : _a2[0]) || "";
        if (type === "series") {
          const seasonMatch = linkTitle.match(/Season\s*\d+/i);
          if (seasonMatch) {
            linkTitle = seasonMatch[0];
          }
        }
        if (episodesLink && linkTitle) {
          links.push({
            title: linkTitle,
            episodesLink: type === "series" ? episodesLink : "",
            directLinks: type === "movie" ? [{ title: "Movie", link: episodesLink, type: "movie" }] : [],
            quality
          });
        }
      });
      console.log("drive meta", links, type);
      return {
        title,
        synopsis,
        image,
        imdbId,
        type,
        linkList: links
      };
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

