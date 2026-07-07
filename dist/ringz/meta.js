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

// providers/ringz/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: data
  }) {
    var _a, _b;
    try {
      const dataJson = JSON.parse(data);
      const title = (dataJson == null ? void 0 : dataJson.kn) || (dataJson == null ? void 0 : dataJson.mn);
      const image = (dataJson == null ? void 0 : dataJson.IH) || (dataJson == null ? void 0 : dataJson.IV);
      const tags = dataJson == null ? void 0 : dataJson.gn.split(",").slice(0, 3).map((tag) => tag.trim());
      const type = (dataJson == null ? void 0 : dataJson.cg) === "webSeries" ? "series" : "movie";
      const linkList = [];
      if ((dataJson == null ? void 0 : dataJson.cg) === "webSeries") {
        (_a = ["1", "2", "3", "4"]) == null ? void 0 : _a.forEach((item) => {
          var _a2;
          const directLinks = [];
          if (typeof (dataJson == null ? void 0 : dataJson["eServer" + item]) === "object" && ((_a2 = Object == null ? void 0 : Object.keys(dataJson == null ? void 0 : dataJson["eServer" + item])) == null ? void 0 : _a2.length) > 0) {
            Object.keys(dataJson == null ? void 0 : dataJson["eServer" + item]).forEach((key) => {
              directLinks.push({
                title: "Episode " + key,
                link: JSON.stringify({
                  url: dataJson == null ? void 0 : dataJson["eServer" + item][key],
                  server: "Server " + item
                })
              });
            });
            linkList.push({
              title: (dataJson == null ? void 0 : dataJson.pn) + " (Server " + item + ")",
              directLinks
            });
          }
        });
      } else {
        const directLinks = [];
        (_b = ["1", "2", "3", "4"]) == null ? void 0 : _b.forEach((item) => {
          if (dataJson == null ? void 0 : dataJson["s" + item]) {
            directLinks.push({
              title: "Server " + item + " (HD)",
              link: JSON.stringify({
                url: dataJson == null ? void 0 : dataJson.s1,
                server: "Server " + item
              })
            });
          }
          if (dataJson == null ? void 0 : dataJson["4s" + item]) {
            directLinks.push({
              title: "Server " + item + " (480p)",
              link: JSON.stringify({
                url: dataJson == null ? void 0 : dataJson["4s" + item],
                server: "Server " + item
              })
            });
          }
        });
        linkList.push({
          title: dataJson == null ? void 0 : dataJson.pn,
          directLinks
        });
      }
      return {
        title,
        image,
        imdbId: "",
        synopsis: "",
        type,
        linkList,
        tags
      };
    } catch (err) {
      return {
        title: "",
        image: "",
        imdbId: "",
        synopsis: "",
        type: "movie",
        linkList: [],
        tags: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

