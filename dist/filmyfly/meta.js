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

// providers/filmyfly/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    try {
      const { axios, cheerio, commonHeaders: headers } = providerContext;
      const url = link;
      const res = yield axios.get(url, { headers });
      const data = res.data;
      const $ = cheerio.load(data);
      const type = url.includes("tvshows") ? "series" : "movie";
      const imdbId = "";
      const title = $('.fname:contains("Name")').find(".colora").text().trim();
      const image = $(".ss").find("img").attr("src") || "";
      const synopsis = $('.fname:contains("Description")').find(".colorg").text().trim();
      const tags = $('.fname:contains("Genre")').find(".colorb").text().split(",") || [];
      const rating = "";
      const links = [];
      const downloadLink = $(".dlbtn").find("a").attr("href");
      if (downloadLink) {
        links.push({
          title,
          episodesLink: downloadLink
        });
      }
      return {
        title,
        tags,
        rating,
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

