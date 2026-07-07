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

// providers/movieBox/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    var _a;
    const { axios, cheerio } = providerContext;
    try {
      const episodeLinks = [];
      const proxyUrl = `https://worker.zendax.me/api/moviebox?url=${encodeURIComponent(url)}`;
      const response = yield fetch(proxyUrl);
      const data = yield response.json();
      const list = ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.list) || [];
      list.forEach((item) => {
        const seriesTitle = (item == null ? void 0 : item.ep) ? `S-${item == null ? void 0 : item.se} E-${item == null ? void 0 : item.ep}` : (item == null ? void 0 : item.title) || "";
        const episodesLink = (item == null ? void 0 : item.resourceLink) || "";
        if (episodesLink) {
          episodeLinks.push({
            title: seriesTitle.trim(),
            link: JSON.stringify({
              url: episodesLink,
              title: seriesTitle.trim()
            })
          });
        }
      });
      return episodeLinks;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

