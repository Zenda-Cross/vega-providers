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

// providers/guardahd/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const axios = providerContext.axios;
    try {
      console.log("all", link);
      const res = yield axios.get(link);
      const data = res.data;
      const meta = {
        title: ((_a = data == null ? void 0 : data.meta) == null ? void 0 : _a.name) || "",
        synopsis: ((_b = data == null ? void 0 : data.meta) == null ? void 0 : _b.description) || "",
        image: ((_c = data == null ? void 0 : data.meta) == null ? void 0 : _c.background) || "",
        imdbId: ((_d = data == null ? void 0 : data.meta) == null ? void 0 : _d.imdb_id) || "",
        type: ((_e = data == null ? void 0 : data.meta) == null ? void 0 : _e.type) || "movie"
      };
      const links = [];
      let directLinks = [];
      let season = /* @__PURE__ */ new Map();
      if (meta.type === "series") {
        (_g = (_f = data == null ? void 0 : data.meta) == null ? void 0 : _f.videos) == null ? void 0 : _g.map((video) => {
          var _a2, _b2, _c2;
          if ((video == null ? void 0 : video.season) <= 0) return;
          if (!season.has(video == null ? void 0 : video.season)) {
            season.set(video == null ? void 0 : video.season, []);
          }
          season.get(video == null ? void 0 : video.season).push({
            title: "Episode " + (video == null ? void 0 : video.episode),
            type: "series",
            link: `${(_a2 = data == null ? void 0 : data.meta) == null ? void 0 : _a2.imdb_id}-${(_b2 = video == null ? void 0 : video.id) == null ? void 0 : _b2.split(":")[1]}-${(_c2 = video == null ? void 0 : video.id) == null ? void 0 : _c2.split(":")[2]}`
          });
        });
        const keys = Array.from(season.keys());
        keys.sort();
        keys.map((key) => {
          directLinks = season.get(key);
          links.push({
            title: `Season ${key}`,
            directLinks
          });
        });
      } else {
        links.push({
          title: (_h = data == null ? void 0 : data.meta) == null ? void 0 : _h.name,
          directLinks: [
            {
              title: "Movie",
              type: "movie",
              link: `${(_i = data == null ? void 0 : data.meta) == null ? void 0 : _i.imdb_id}-`
            }
          ]
        });
      }
      return __spreadProps(__spreadValues({}, meta), {
        linkList: links
      });
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

