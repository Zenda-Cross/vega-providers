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

// providers/vadapav/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    try {
      const baseUrl = url == null ? void 0 : url.split("/").slice(0, 3).join("/");
      const res = yield axios.get(url);
      const html = res.data;
      let $ = cheerio.load(html);
      const episodeLinks = [];
      $('.file-entry:not(:contains("Parent Directory"))').map((i, element) => {
        var _a, _b, _c, _d, _e, _f;
        const link = $(element).attr("href");
        if (link && (((_a = $(element).text()) == null ? void 0 : _a.includes(".mp4")) || ((_b = $(element).text()) == null ? void 0 : _b.includes(".mkv")))) {
          episodeLinks.push({
            title: ((_e = (_d = (_c = $(element).text()) == null ? void 0 : _c.match(/E\d+/)) == null ? void 0 : _d[0]) == null ? void 0 : _e.replace("E", "Episode ")) || i + 1 + ". " + ((_f = $(element).text()) == null ? void 0 : _f.replace(".mkv", "")),
            link: baseUrl + link
          });
        }
      });
      return episodeLinks;
    } catch (err) {
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

