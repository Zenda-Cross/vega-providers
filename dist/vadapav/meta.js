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

// providers/vadapav/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b;
    try {
      const { axios, cheerio } = providerContext;
      const baseUrl = link == null ? void 0 : link.split("/").slice(0, 3).join("/");
      const url = link;
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      const title = ((_b = (_a = $(".directory").children().first().text().trim()) == null ? void 0 : _a.split("/").pop()) == null ? void 0 : _b.trim()) || "";
      const links = [];
      $('.directory-entry:not(:contains("Parent Directory"))').map(
        (i, element) => {
          const link2 = $(element).attr("href");
          if (link2) {
            links.push({
              episodesLink: baseUrl + link2,
              title: $(element).text()
            });
          }
        }
      );
      const directLinks = [];
      $('.file-entry:not(:contains("Parent Directory"))').map((i, element) => {
        var _a2, _b2;
        const link2 = $(element).attr("href");
        if (link2 && (((_a2 = $(element).text()) == null ? void 0 : _a2.includes(".mp4")) || ((_b2 = $(element).text()) == null ? void 0 : _b2.includes(".mkv")))) {
          directLinks.push({
            title: i + 1 + ". " + $(element).text(),
            link: baseUrl + link2
          });
        }
      });
      if (directLinks.length > 0) {
        links.push({
          title: title + " DL",
          directLinks
        });
      }
      return {
        title,
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: links
      };
    } catch (err) {
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

