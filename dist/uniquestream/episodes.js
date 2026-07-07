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

// providers/uniquestream/episodes.ts
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
    const { axios, commonHeaders } = providerContext;
    try {
      let allEpisodes = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const pageUrl = url.replace(/page=\d+/, `page=${page}`).replace(/limit=\d+/, `limit=20`);
        const res = yield axios.get(pageUrl, { headers: commonHeaders });
        const data = Array.isArray(res.data) ? res.data : ((_a = res.data) == null ? void 0 : _a.data) || [];
        if (data.length > 0) {
          allEpisodes = allEpisodes.concat(data);
          page++;
          if (data.length < 20) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return allEpisodes.map((item) => ({
        title: item.title || `Episode ${item.episode_number}`,
        link: `https://anime.uniquestream.net/api/v1/episode/${item.content_id}/media/dash/ja-JP`
      }));
    } catch (error) {
      console.error("uniquestream getEpisodes failed", error);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

