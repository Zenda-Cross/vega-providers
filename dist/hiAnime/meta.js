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

// providers/hiAnime/meta.ts
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
      const { getBaseUrl, axios } = providerContext;
      const baseUrl = yield getBaseUrl("consumet");
      const url = `${baseUrl}/anime/zoro/info?id=` + link;
      const res = yield axios.get(url);
      const data = res.data;
      const meta = {
        title: data.title,
        synopsis: data.description,
        image: data.image,
        tags: [
          data == null ? void 0 : data.type,
          (data == null ? void 0 : data.subOrDub) === "both" ? "Sub And Dub" : data == null ? void 0 : data.subOrDub
        ],
        imdbId: "",
        type: data.episodes.length > 0 ? "series" : "movie"
      };
      const linkList = [];
      const subLinks = [];
      data.episodes.forEach((episode) => {
        if (!(episode == null ? void 0 : episode.isSubbed)) {
          return;
        }
        const title = "Episode " + episode.number + ((episode == null ? void 0 : episode.isFiller) ? " (Filler)" : "");
        const link2 = episode.id + "$sub";
        if (link2 && title) {
          subLinks.push({
            title,
            link: link2
          });
        }
      });
      linkList.push({
        title: meta.title + " (Sub)",
        directLinks: subLinks
      });
      if ((data == null ? void 0 : data.subOrDub) === "both") {
        const dubLinks = [];
        data.episodes.forEach((episode) => {
          if (!(episode == null ? void 0 : episode.isDubbed)) {
            return;
          }
          const title = "Episode " + episode.number + ((episode == null ? void 0 : episode.isFiller) ? " (Filler)" : "");
          const link2 = episode.id + "$dub";
          if (link2 && title) {
            dubLinks.push({
              title,
              link: link2
            });
          }
        });
        linkList.push({
          title: meta.title + " (Dub)",
          directLinks: dubLinks
        });
      }
      return __spreadProps(__spreadValues({}, meta), {
        linkList
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

