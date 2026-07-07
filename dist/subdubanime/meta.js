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

// providers/subdubanime/meta.ts
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
      const { axios } = providerContext;
      const res = yield axios.get("https://test.blakiteapi.xyz/api/getAllAnime.php");
      const catalogData = ((_a = res.data) == null ? void 0 : _a.data) || {};
      let targetItem = null;
      let category = "movie";
      for (const cat of ["movies", "series", "dramas"]) {
        const items = catalogData[cat] ? Object.values(catalogData[cat]) : [];
        const found = items.find((item) => (item.tmdbId || item.originalTmdbId) === link);
        if (found) {
          targetItem = found;
          category = cat;
          break;
        }
      }
      if (!targetItem) {
        throw new Error(`Item not found in catalog: ${link}`);
      }
      const tmdbData = targetItem.TMDB_DATA || {};
      const title = targetItem.title || "";
      const synopsis = tmdbData.synopsis || "";
      const image = ((_b = targetItem.IMAGES) == null ? void 0 : _b.poster) || ((_c = targetItem.IMAGES) == null ? void 0 : _c.backdrop) || "";
      const rating = tmdbData.rating || "";
      const type = category === "movies" ? "movie" : "series";
      const linkList = [];
      if (type === "movie") {
        linkList.push({
          title: "Movie",
          directLinks: [
            {
              title,
              link: `${link}-1-1`,
              type: "movie"
            }
          ]
        });
      } else {
        const seasons = targetItem.seasons || {};
        Object.keys(seasons).forEach((seasonNum) => {
          const seasonInfo = seasons[seasonNum];
          const totalEpisodes = seasonInfo.totalEpisodes || 1;
          const directLinks = [];
          for (let ep = 1; ep <= totalEpisodes; ep++) {
            directLinks.push({
              title: `Episode ${ep}`,
              link: `${link}-${seasonNum}-${ep}`,
              type: "series"
            });
          }
          linkList.push({
            title: `Season ${seasonNum}`,
            directLinks
          });
        });
      }
      return {
        title,
        image,
        synopsis,
        imdbId: "",
        type,
        rating,
        linkList
      };
    } catch (err) {
      console.error("Genga getMeta error:", err);
      return {
        title: "",
        image: "",
        synopsis: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

