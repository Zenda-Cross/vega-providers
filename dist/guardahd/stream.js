"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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

// providers/guardahd/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});


// providers/extractors/supeVideo.ts
function superVideoExtractor(data) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      var functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
      var match = functionRegex.exec(data);
      let p = "";
      if (match) {
        var encodedString = match[2];
        p = (_a = encodedString.split("',36,")) == null ? void 0 : _a[0].trim();
        let a = 36;
        let c = encodedString.split("',36,")[1].slice(2).split("|").length;
        let k = encodedString.split("',36,")[1].slice(2).split("|");
        while (c--) {
          if (k[c]) {
            var regex = new RegExp("\\b" + c.toString(a) + "\\b", "g");
            p = p.replace(regex, k[c]);
          }
        }
      } else {
        console.log("No match found");
      }
      const streamUrl = (_b = p == null ? void 0 : p.match(/file:\s*"([^"]+\.m3u8[^"]*)"/)) == null ? void 0 : _b[1];
      console.log("streamUrl:", streamUrl);
      return streamUrl || "";
    } catch (err) {
      console.error("SuperVideoExtractor Error:", err);
      return "";
    }
  });
}
__name(superVideoExtractor, "superVideoExtractor");

// providers/guardahd/stream.ts
var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: id,
    type,
    providerContext
  }) {
    try {
      const { axios, cheerio, commonHeaders } = providerContext;
      function ExtractGuardahd(_02) {
        return __async(this, arguments, function* ({
          imdb
          // type, // season,
        }) {
          try {
            const baseUrl = "https://guardahd.stream";
            const path = "/set-movie-a/" + imdb;
            const url = baseUrl + path;
            console.log("url:", url);
            const res = yield axios.get(url, { timeout: 4e3 });
            const html = res.data;
            const $ = cheerio.load(html);
            const superVideoUrl = $('li:contains("supervideo")').attr("data-link");
            console.log("superVideoUrl:", superVideoUrl);
            if (!superVideoUrl) {
              return null;
            }
            const controller2 = new AbortController();
            const signal2 = controller2.signal;
            setTimeout(() => controller2.abort(), 4e3);
            const res2 = yield fetch("https:" + superVideoUrl, {
              signal: signal2,
              headers: __spreadValues({}, commonHeaders)
            });
            const data = yield res2.text();
            console.log("mostraguarda data:", data);
            const streamUrl = yield superVideoExtractor(data);
            console.log("superStreamUrl:", streamUrl);
            return streamUrl;
          } catch (err) {
            console.error("Error in GetMostraguardaStram:", err);
          }
        });
      }
      __name(ExtractGuardahd, "ExtractGuardahd");
      function GetMostraguardaStream(_02) {
        return __async(this, arguments, function* ({
          imdb,
          type: type2,
          season: season2,
          episode: episode2
        }) {
          try {
            const baseUrl = "https://mostraguarda.stream";
            const path = type2 === "tv" ? `/serie/${imdb}/${season2}/${episode2}` : `/movie/${imdb}`;
            const url = baseUrl + path;
            console.log("url:", url);
            const res = yield axios(url, { timeout: 4e3 });
            const html = res.data;
            const $ = cheerio.load(html);
            const superVideoUrl = $('li:contains("supervideo")').attr("data-link");
            if (!superVideoUrl) {
              return null;
            }
            const controller2 = new AbortController();
            const signal2 = controller2.signal;
            setTimeout(() => controller2.abort(), 4e3);
            const res2 = yield fetch("https:" + superVideoUrl, {
              signal: signal2,
              headers: __spreadValues({}, commonHeaders)
            });
            const data = yield res2.text();
            const streamUrl = yield superVideoExtractor(data);
            return streamUrl;
          } catch (err) {
            console.error("Error in GetMostraguardaStram:", err);
          }
        });
      }
      __name(GetMostraguardaStream, "GetMostraguardaStream");
      console.log(id);
      const streams = [];
      const [imdbId, season, episode] = id.split("-");
      console.log("Parsed ID:", { imdbId, season, episode });
      console.log("imdbId:", imdbId);
      const mostraguardaStream = yield GetMostraguardaStream({
        imdb: imdbId,
        type,
        season,
        episode
      });
      if (mostraguardaStream) {
        streams.push({
          server: "Supervideo 1",
          link: mostraguardaStream,
          type: "m3u8"
        });
      }
      const guardahdStream = yield ExtractGuardahd({
        imdb: imdbId,
        type,
        season,
        episode
      });
      if (guardahdStream) {
        streams.push({
          server: "Supervideo 2",
          link: guardahdStream,
          type: "m3u8"
        });
      }
      return streams;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

