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

// providers/uniquestream/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    const { axios, commonHeaders } = providerContext;
    try {
      const res = yield axios.get(link, { headers: commonHeaders });
      const data = res.data;
      const series = data.content_id ? data : data.data || data;
      const linkList = [];
      if (series.seasons && series.seasons.length > 0) {
        for (const season of series.seasons) {
          linkList.push({
            title: season.title || `Season ${season.season_number || ""}`.trim(),
            episodesLink: `https://anime.uniquestream.net/api/v1/season/${season.content_id}/episodes?page=1&limit=100&order_by=asc`
          });
        }
      } else {
        linkList.push({
          title: "Episodes",
          episodesLink: `https://anime.uniquestream.net/api/v1/season/${series.content_id}/episodes?page=1&limit=100&order_by=asc`
        });
      }
      let imageUrl = series.image || "";
      if (series.images && Array.isArray(series.images)) {
        const widePoster = series.images.find((img) => img.type === "poster_wide");
        if (widePoster && widePoster.url) {
          imageUrl = widePoster.url;
        }
      }
      return {
        title: series.title || "",
        image: imageUrl,
        synopsis: series.description || "",
        imdbId: "",
        type: "series",
        tags: series.genre || [],
        rating: series.rating_avg ? String(series.rating_avg) : "",
        linkList
      };
    } catch (error) {
      console.error("uniquestream getMeta failed", error);
      return {
        title: "",
        image: "",
        synopsis: "",
        imdbId: "",
        type: "series",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

