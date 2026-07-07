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

// providers/moviesApi/stream.ts
var stream_exports = {};
__export(stream_exports, {
  mpGetStream: () => mpGetStream
});

var mpGetStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: id,
    type,
    providerContext
  }) {
    var _a, _b;
    try {
      const { getBaseUrl, cheerio } = providerContext;
      const streams = [];
      const { season, episode, tmdbId } = JSON.parse(id);
      const baseUrl = yield getBaseUrl("moviesapi");
      const link = type === "movie" ? `${baseUrl}/movie/${tmdbId}` : `${baseUrl}/tv/${tmdbId}-${season}-${episode}`;
      const res = yield fetch(link, {
        headers: {
          referer: baseUrl
        }
      });
      const baseData = yield res.text();
      const $ = cheerio.load(baseData);
      const embededUrl = $("iframe").attr("src") || "";
      const response = yield fetch(embededUrl, {
        credentials: "omit",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Alt-Used": "w1.moviesapi.club",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
          referer: baseUrl
        },
        referrer: baseUrl,
        method: "GET",
        mode: "cors"
      });
      const data2 = yield response.text();
      const contents = ((_a = data2.match(/const\s+Encrypted\s*=\s*['"]({.*})['"]/)) == null ? void 0 : _a[1]) || "";
      if (embededUrl) {
        const res2 = yield fetch(
          "https://ext.8man.me/api/decrypt?passphrase==JV[t}{trEV=Ilh5",
          {
            method: "POST",
            body: contents
          }
        );
        const finalData = yield res2.json();
        const subtitle = (_b = finalData == null ? void 0 : finalData.subtitles) == null ? void 0 : _b.map((sub) => {
          var _a2;
          return {
            title: (sub == null ? void 0 : sub.label) || "Unknown",
            language: sub == null ? void 0 : sub.label,
            type: ((_a2 = sub == null ? void 0 : sub.file) == null ? void 0 : _a2.includes(".vtt")) ? "text/vtt" : "application/x-subrip",
            uri: sub == null ? void 0 : sub.file
          };
        });
        streams.push({
          server: "vidstreaming ",
          type: "m3u8",
          subtitles: subtitle,
          link: finalData == null ? void 0 : finalData.videoUrl,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
            Referer: baseUrl,
            Origin: baseUrl,
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            Pragma: "no-cache",
            "Cache-Control": "no-cache"
          }
        });
      }
      return streams;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "mpGetStream");
exports.mpGetStream = mpGetStream;
// Annotate the CommonJS export names for ESM import in node:

