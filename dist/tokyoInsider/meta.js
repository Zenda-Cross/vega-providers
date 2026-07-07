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

// providers/tokyoInsider/meta.ts
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
      const { cheerio } = providerContext;
      const url = link;
      const res = yield fetch(url);
      const data = yield res.text();
      const $ = cheerio.load(data);
      const meta = {
        title: $('.c_h2:contains("Title(s):")').text().replace("Title(s):", "").trim().split("\n")[0],
        synopsis: $('.c_h2b:contains("Summary:"),.c_h2:contains("Summary:")').text().replace("Summary:", "").trim(),
        image: $(".a_img").attr("src") || "",
        imdbId: "",
        type: "series"
      };
      const episodesList = [];
      $(".episode").map((i, element) => {
        const link2 = "https://www.tokyoinsider.com" + $(element).find("a").attr("href") || $(".download-link").attr("href");
        let title = $(element).find("a").find("em").text() + " " + $(element).find("a").find("strong").text();
        if (!title.trim()) {
          title = $(".download-link").text();
        }
        if (link2 && title.trim()) {
          episodesList.push({ title, link: link2 });
        }
      });
      return __spreadProps(__spreadValues({}, meta), {
        linkList: [
          {
            title: meta.title,
            directLinks: episodesList
          }
        ]
      });
    } catch (err) {
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "series",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

