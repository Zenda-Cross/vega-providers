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

// providers/dooflix/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var headers = {
  "Accept-Encoding": "gzip",
  "API-KEY": "2pm95lc6prpdbk0ppji9rsqo",
  Connection: "Keep-Alive",
  "If-Modified-Since": "Wed, 14 Aug 2024 13:00:04 GMT",
  "User-Agent": "okhttp/3.14.9"
};
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b, _c, _d;
    try {
      const { axios } = providerContext;
      const res = yield axios.get(link, { headers });
      const resData = res.data;
      const jsonStart = resData == null ? void 0 : resData.indexOf("{");
      const jsonEnd = (resData == null ? void 0 : resData.lastIndexOf("}")) + 1;
      const data = ((_a = JSON == null ? void 0 : JSON.parse(resData == null ? void 0 : resData.substring(jsonStart, jsonEnd))) == null ? void 0 : _a.title) ? JSON == null ? void 0 : JSON.parse(resData == null ? void 0 : resData.substring(jsonStart, jsonEnd)) : resData;
      const title = (data == null ? void 0 : data.title) || "";
      const synopsis = (data == null ? void 0 : data.description) || "";
      const image = (data == null ? void 0 : data.poster_url) || "";
      const cast = (data == null ? void 0 : data.cast) || [];
      const rating = (data == null ? void 0 : data.imdb_rating) || "";
      const type = Number(data == null ? void 0 : data.is_tvseries) ? "series" : "movie";
      const tags = ((_b = data == null ? void 0 : data.genre) == null ? void 0 : _b.map((genre) => genre == null ? void 0 : genre.name)) || [];
      const links = [];
      if (type === "series") {
        (_c = data == null ? void 0 : data.season) == null ? void 0 : _c.map((season) => {
          var _a2;
          const title2 = (season == null ? void 0 : season.seasons_name) || "";
          const directLinks = ((_a2 = season == null ? void 0 : season.episodes) == null ? void 0 : _a2.map((episode) => ({
            title: episode == null ? void 0 : episode.episodes_name,
            link: episode == null ? void 0 : episode.file_url
          }))) || [];
          links.push({
            title: title2,
            directLinks
          });
        });
      } else {
        (_d = data == null ? void 0 : data.videos) == null ? void 0 : _d.map((video) => {
          links.push({
            title: title + " " + (video == null ? void 0 : video.label),
            directLinks: [
              {
                title: "Play",
                link: video == null ? void 0 : video.file_url
              }
            ]
          });
        });
      }
      return {
        image: (image == null ? void 0 : image.includes("https")) ? image : image == null ? void 0 : image.replace("http", "https"),
        synopsis,
        title,
        rating,
        imdbId: "",
        cast,
        tags,
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

