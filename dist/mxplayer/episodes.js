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

// providers/mxplayer/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
var cachedUserId = null;
var getUserId = /* @__PURE__ */ __name(() => {
  if (!cachedUserId) {
    cachedUserId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  return cachedUserId;
}, "getUserId");
var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    var _a;
    try {
      const { axios } = providerContext;
      const seasonId = url.split("*")[0];
      const endpoint = `https://api.mxplayer.in/v1/web/detail/tab/tvshowepisodes?type=season&id=${seasonId}&sortOrder=0&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.mxplayer.in/",
        "Origin": "https://www.mxplayer.in"
      };
      const res = yield axios.get(endpoint, { headers });
      const payload = ((_a = res.data) == null ? void 0 : _a.data) || res.data || {};
      const items = payload.items || payload || [];
      const episodes = [];
      items.forEach((item) => {
        const epNo = item.episodeNo || item.episode_number || item.sequence || "";
        const title = `Episode ${epNo} - ${item.title || ""}`;
        episodes.push({
          title,
          link: `${item.id}*episode`
        });
      });
      return episodes;
    } catch (err) {
      console.error("MXPlayer getEpisodes error:", err);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

