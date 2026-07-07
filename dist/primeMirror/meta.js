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

// providers/primeMirror/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link
  }) {
    var _a, _b, _c, _d;
    let providerValue = "primeMirror";
    try {
      const isPrime = providerValue === "primeMirror" ? "isPrime=true" : "isPrime=false";
      const url = `https://netmirror.8man.dev/api/net-proxy?${isPrime}&url=${encodeURIComponent(
        link
      )}`;
      console.log("nfifo", url);
      const res = yield fetch(url, {
        credentials: "omit"
      });
      const data = yield res.json();
      const id = (_a = link.split("id=")[1]) == null ? void 0 : _a.split("&")[0];
      const meta = {
        title: data.title,
        synopsis: data.desc,
        image: `https://img.nfmirrorcdn.top/poster/h/${id}.jpg`,
        cast: (_b = data == null ? void 0 : data.short_cast) == null ? void 0 : _b.split(","),
        tags: [data == null ? void 0 : data.year, data == null ? void 0 : data.hdsd, ...(_c = data == null ? void 0 : data.thismovieis) == null ? void 0 : _c.split(",")],
        imdbId: "",
        type: "series"
      };
      console.log("nfinfo", meta);
      const linkList = [];
      if (((_d = data == null ? void 0 : data.season) == null ? void 0 : _d.length) > 0) {
        data.season.map((season) => {
          linkList.push({
            title: "Season " + (season == null ? void 0 : season.s),
            episodesLink: season == null ? void 0 : season.id
          });
        });
      } else {
        linkList.push({
          title: meta.title,
          directLinks: [{ link: id, title: "Movie", type: "movie" }]
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
        type: "",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

