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

// providers/netflixMirror/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url: link,
    providerContext
  }) {
    var _a;
    const { getBaseUrl, axios } = providerContext;
    let providerValue = "netflixMirror";
    try {
      const baseUrl = yield getBaseUrl("nfMirror");
      const url = `${baseUrl}${providerValue === "netflixMirror" ? "/episodes.php?s=" : "/pv/episodes.php?s="}` + link + "&t=" + Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3);
      console.log("nfEpisodesUrl", url);
      let page = 1;
      let hasMorePages = true;
      const episodeList = [];
      while (hasMorePages) {
        const res = yield axios.get(url + `&page=${page}`, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });
        const data = res.data;
        (_a = data == null ? void 0 : data.episodes) == null ? void 0 : _a.map((episode) => {
          episodeList.push({
            title: "Episode " + (episode == null ? void 0 : episode.ep.replace("E", "")),
            link: episode == null ? void 0 : episode.id
          });
        });
        if (data == null ? void 0 : data.nextPageShow) {
          page++;
        } else {
          hasMorePages = false;
        }
      }
      return episodeList.sort((a, b) => {
        const aNum = parseInt(a.title.replace("Episode ", ""));
        const bNum = parseInt(b.title.replace("Episode ", ""));
        return aNum - bNum;
      });
    } catch (err) {
      console.error("nfGetEpisodes error", err);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

