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

// providers/subdubanime/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link
  }) {
    try {
      const parts = link.split("-");
      if (parts.length < 3) {
        throw new Error(`Invalid Genga link format: ${link}`);
      }
      const tmdbId = parts[0];
      const season = parts[1];
      const episode = parts[2];
      const url = `https://test.blakiteapi.xyz/api/get.php?id=${season}-${episode}&tmdbId=${tmdbId}`;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://test.blakiteapi.xyz/"
      };
      const res = yield fetch(url, { headers });
      const json = yield res.json();
      if (!json.success || !json.data) {
        return [];
      }
      const data = json.data;
      const dataId = data.dataId;
      const formatType = data.format || "M3U8";
      const ranges = data.ranges || "";
      const qid = data.qid || 5;
      if (!dataId) {
        return [];
      }
      const rangeMap = {};
      if (formatType === "M3U8" && ranges) {
        const lines = ranges.split("\n");
        lines.forEach((line) => {
          const match = line.trim().match(/^(\d+-\d+)\s*\(([^)]+)\)/);
          if (match) {
            rangeMap[match[2]] = match[1];
          }
        });
      }
      const qualityLabels = ["240p", "360p", "480p", "720p", "1080p"];
      const qualityCodes = ["oaa", "baa", "caa", "gaa", "haa"];
      const maxIdx = Math.min(qid, qualityLabels.length) - 1;
      const streams = [];
      for (let i = 0; i <= maxIdx; i++) {
        const label = qualityLabels[i];
        const code = qualityCodes[i];
        let streamUrl = "";
        if (formatType === "M3U8") {
          const rRange = rangeMap[label] || "";
          streamUrl = `https://hugh.cdn.rumble.cloud/video/${dataId}.${code}.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl`;
          if (rRange) {
            streamUrl += `&r_range=${rRange}`;
          }
        } else {
          streamUrl = `https://hugh.cdn.rumble.cloud/video/${dataId}.${code}.mp4`;
        }
        streams.push({
          server: `Genga-Rumble-${label}`,
          link: streamUrl,
          type: formatType === "M3U8" ? "m3u8" : "mp4",
          quality: label.replace("p", "")
        });
      }
      return streams;
    } catch (err) {
      console.error("Genga getStream error:", err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

