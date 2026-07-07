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

// providers/katMovieFix/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodeLinks: () => getEpisodeLinks,
  getEpisodes: () => getEpisodes
});

function getEpisodeLinks(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    try {
      const res = yield providerContext.axios.get(url);
      const $ = providerContext.cheerio.load(res.data || "");
      const episodes = [];
      $("a").each((i, el) => {
        var _a;
        const $el = $(el);
        const href = ($el.attr("href") || "").trim();
        const text = $el.text().trim();
        if (href && (text.includes("Episode") || /E\d+/i.test(text) || href.includes("vcloud.lol"))) {
          let epNum = ((_a = text.match(/E\d+/i)) == null ? void 0 : _a[0]) || text;
          if (/^\d+$/.test(epNum)) epNum = `Episode ${epNum}`;
          episodes.push({
            title: epNum,
            link: href
          });
        }
      });
      return episodes;
    } catch (err) {
      console.error("getEpisodeLinks error:", err);
      return [];
    }
  });
}
__name(getEpisodeLinks, "getEpisodeLinks");
function getEpisodes(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    return yield getEpisodeLinks({ url, providerContext });
  });
}
__name(getEpisodes, "getEpisodes");
exports.getEpisodeLinks = getEpisodeLinks;
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

