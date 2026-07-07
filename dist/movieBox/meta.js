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

// providers/movieBox/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b, _c;
    try {
      const { axios, cheerio, getBaseUrl } = providerContext;
      const links = [];
      const proxyUrl = `https://worker.zendax.me/api/moviebox?url=${encodeURIComponent(link)}`;
      const response = yield fetch(proxyUrl);
      const data = (yield response.json()).data;
      console.log("data", data);
      const title = ((data == null ? void 0 : data.title) || "").replace(/\s*\[.*?\]\s*$/, "");
      const synopsis = (data == null ? void 0 : data.description) || "";
      const image = ((_a = data == null ? void 0 : data.cover) == null ? void 0 : _a.url) || "";
      const rating = (data == null ? void 0 : data.imdbRatingValue) || "";
      const tags = ((_c = (_b = data == null ? void 0 : data.genre) == null ? void 0 : _b.split(",")) == null ? void 0 : _c.map((tag) => tag.trim())) || [];
      const dubs = (data == null ? void 0 : data.dubs) || [];
      dubs == null ? void 0 : dubs.forEach((dub) => {
        const link2 = {
          title: dub == null ? void 0 : dub.lanName,
          episodesLink: `/wefeed-mobile-bff/subject-api/resource?subjectId=${dub == null ? void 0 : dub.subjectId}&page=1&perPage=20&all=0&startPosition=1&endPosition=1&pagerMode=0&resolution=1080&se=1&epFrom=1&epTo=1`
        };
        links.push(link2);
      });
      console.log("meta", {
        title,
        synopsis,
        image,
        rating,
        tags,
        links
      });
      return {
        title,
        synopsis,
        image,
        rating,
        tags,
        imdbId: "",
        type: "movie",
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

