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

// providers/torrentio/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  link: id,
  type,
  providerContext
}) {
  var _a, _b, _c, _d, _e, _f;
  try {
    const payload = (() => {
      try {
        return JSON.parse(id);
      } catch (e) {
        return { imdbId: id };
      }
    })();
    let imdbId = (_b = (_a = payload.imdbId) != null ? _a : id) != null ? _b : "";
    const season = (_c = payload.season) != null ? _c : "";
    const episode = (_d = payload.episode) != null ? _d : "";
    const effectiveType = (_f = (_e = payload.type) != null ? _e : type) != null ? _f : "movie";
    if (!imdbId || imdbId === "undefined" || imdbId === "[object Object]") {
      if (id && id.startsWith("tt")) {
        imdbId = id;
      }
    }
    if (!imdbId || !imdbId.startsWith("tt")) {
      console.warn("torrentio: missing or invalid imdbId in link payload");
      return [];
    }
    let url = `https://torrentio.strem.fun/stream/${effectiveType}/${imdbId}`;
    if (effectiveType === "series" && season && episode) {
      url += `:${season}:${episode}`;
    }
    url += `.json`;
    console.log("Torrentio URL:", url);
    const res = yield providerContext.axios.get(url, {
      timeout: 1e4
    });
    const streams = [];
    if (res.data && res.data.streams) {
      res.data.streams.forEach((s) => {
        let quality = void 0;
        const lowerName = (s.name || "").toLowerCase() + " " + (s.title || "").toLowerCase();
        if (lowerName.includes("2160") || lowerName.includes("4k")) quality = "2160";
        else if (lowerName.includes("1080")) quality = "1080";
        else if (lowerName.includes("720")) quality = "720";
        else if (lowerName.includes("480")) quality = "480";
        else if (lowerName.includes("360")) quality = "360";
        let link = s.url;
        if (!link && s.infoHash) {
          link = `magnet:?xt=urn:btih:${s.infoHash}`;
        }
        let language = "English";
        const flagsMatch = (s.title || "").match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g);
        if (flagsMatch && flagsMatch.length > 0) {
          language = Array.from(new Set(flagsMatch)).join(" ");
        } else {
          const titleUpper = (s.title || "").toUpperCase();
          const langs = [];
          if (titleUpper.includes("MULTI")) langs.push("Multi");
          if (titleUpper.includes("DUAL")) langs.push("Dual");
          if (titleUpper.includes("HINDI")) langs.push("Hindi");
          if (titleUpper.includes("TAMIL")) langs.push("Tamil");
          if (titleUpper.includes("TELUGU")) langs.push("Telugu");
          if (titleUpper.includes("SPANISH")) langs.push("Spanish");
          if (titleUpper.includes("FRENCH")) langs.push("French");
          if (titleUpper.includes("GERMAN")) langs.push("German");
          if (titleUpper.includes("ITALIAN")) langs.push("Italian");
          if (titleUpper.includes("KOREAN")) langs.push("Korean");
          if (titleUpper.includes("JAPANESE")) langs.push("Japanese");
          if (titleUpper.includes("DUBBED")) langs.push("Dubbed");
          if (langs.length > 0) {
            language = langs.join(", ");
          }
        }
        let seeders = "";
        const seedersMatch = (s.title || "").match(/👤\s*\d+/);
        if (seedersMatch) {
          seeders = seedersMatch[0];
        } else {
          const slMatch = (s.title || "").match(/S:\s*\d+\s*L:\s*\d+/i);
          if (slMatch) {
            seeders = slMatch[0];
          }
        }
        let resolution = quality ? `${quality}p` : "";
        if (s.name && s.name.includes("\n")) {
          resolution = s.name.split("\n")[1].trim();
        }
        let serverName = resolution ? `${resolution} | ${language}` : language;
        if (seeders) {
          serverName += ` | ${seeders}`;
        }
        if (link) {
          streams.push({
            server: serverName,
            link,
            type: link.startsWith("magnet:") ? "torrent" : "mp4",
            quality
          });
        }
      });
    }
    console.log("Torrentio streams:", streams);
    return streams;
  } catch (err) {
    console.error("Torrentio getStream error:", err);
    return [];
  }
}), "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

