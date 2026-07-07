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

// providers/animetsu/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: id,
    providerContext
  }) {
    var _a;
    try {
      const { axios, openWebView, commonHeaders } = providerContext;
      const baseUrl = "https://animetsu.net";
      const streamUrl = `https://swiftstream.top/proxy`;
      let wafCookies;
      try {
        yield axios.get(baseUrl, {
          headers: __spreadProps(__spreadValues({}, commonHeaders), { Referer: baseUrl })
        });
      } catch (error) {
        if (((_a = error.response) == null ? void 0 : _a.status) === 403) {
          const wafResult = yield openWebView(baseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass Animetsu anti-bot protection.",
            headers: __spreadProps(__spreadValues({}, commonHeaders), { Referer: baseUrl }),
            force: true,
            waitForCookie: "cf_clearance"
          });
          wafCookies = wafResult.cookies;
        }
      }
      const [animeId, episodeNumber] = id.split(":");
      if (!animeId || !episodeNumber) {
        throw new Error("Invalid link format");
      }
      const servers = ["sage", "dio"];
      const streamLinks = [];
      yield Promise.all(
        servers.map((server) => __async(null, null, function* () {
          try {
            const url = `${baseUrl}/v2/api/anime/oppai/${animeId}/${episodeNumber}?server=${server}&source_type=sub`;
            const res = yield axios.get(url, {
              headers: __spreadValues(__spreadProps(__spreadValues({}, commonHeaders), {
                Referer: baseUrl
              }), wafCookies ? { Cookie: wafCookies } : {})
            });
            if (res.data && res.data.sources) {
              const subtitles = [];
              if (res.data.subs && Array.isArray(res.data.subs)) {
                res.data.subs.forEach((sub) => {
                  if (sub.url && sub.lang) {
                    const langCode = sub.lang.toLowerCase().includes("english") ? "en" : sub.lang.toLowerCase().includes("arabic") ? "ar" : sub.lang.toLowerCase().includes("french") ? "fr" : sub.lang.toLowerCase().includes("german") ? "de" : sub.lang.toLowerCase().includes("italian") ? "it" : sub.lang.toLowerCase().includes("portuguese") ? "pt" : sub.lang.toLowerCase().includes("russian") ? "ru" : sub.lang.toLowerCase().includes("spanish") ? "es" : "und";
                    subtitles.push({
                      title: sub.lang,
                      language: langCode,
                      type: "text/vtt",
                      uri: sub.url
                    });
                  }
                });
              }
              res.data.sources.forEach((source) => {
                const sourceUrl = source.url.startsWith("/") ? `${streamUrl}${source.url}` : source.url;
                streamLinks.push({
                  server: `${server} (Sub): ${source.quality}`,
                  link: sourceUrl,
                  type: "m3u8",
                  quality: source.quality,
                  headers: {
                    referer: baseUrl
                  },
                  subtitles: subtitles.length > 0 ? subtitles : []
                });
              });
            }
          } catch (e) {
            console.log(`Error with server ${server}:`, e);
          }
        }))
      );
      yield Promise.all(
        servers.map((server) => __async(null, null, function* () {
          try {
            const url = `${baseUrl}/v2/api/anime/oppai/${animeId}/${episodeNumber}?server=${server}&source_type=dub`;
            const res = yield axios.get(url, {
              headers: __spreadValues(__spreadProps(__spreadValues({}, commonHeaders), {
                Referer: baseUrl
              }), wafCookies ? { Cookie: wafCookies } : {})
            });
            if (res.data && res.data.sources) {
              const subtitles = [];
              if (res.data.subs && Array.isArray(res.data.subs)) {
                res.data.subs.forEach((sub) => {
                  if (sub.url && sub.lang) {
                    const langCode = sub.lang.toLowerCase().includes("english") ? "en" : sub.lang.toLowerCase().includes("arabic") ? "ar" : sub.lang.toLowerCase().includes("french") ? "fr" : sub.lang.toLowerCase().includes("german") ? "de" : sub.lang.toLowerCase().includes("italian") ? "it" : sub.lang.toLowerCase().includes("portuguese") ? "pt" : sub.lang.toLowerCase().includes("russian") ? "ru" : sub.lang.toLowerCase().includes("spanish") ? "es" : "und";
                    subtitles.push({
                      title: sub.lang,
                      language: langCode,
                      type: "text/vtt",
                      uri: sub.url
                    });
                  }
                });
              }
              res.data.sources.forEach((source) => {
                const sourceUrl = source.url.startsWith("/") ? `${streamUrl}${source.url}` : source.url;
                streamLinks.push({
                  server: `${server} (Dub): ${source.quality}`,
                  link: sourceUrl,
                  type: "m3u8",
                  quality: source.quality,
                  headers: {
                    referer: baseUrl
                  },
                  subtitles: subtitles.length > 0 ? subtitles : []
                });
              });
            }
          } catch (e) {
            console.log(`Error with server ${server} (dub):`, e);
          }
        }))
      );
      console.log("Stream links:", streamLinks);
      return streamLinks;
    } catch (err) {
      console.error("animetsu stream error:", err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

