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

// providers/uniquestream/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a;
    const { axios, commonHeaders } = providerContext;
    const streams = [];
    try {
      const res = yield axios.get(link, { headers: commonHeaders });
      const data = res.data;
      if (!data) return streams;
      let softSubtitles = [];
      if (data.hls && Array.isArray(data.hls.subtitles)) {
        softSubtitles = data.hls.subtitles.map((sub) => ({
          language: sub.locale || "unknown",
          url: sub.url || sub.file || sub.link || ""
        })).filter((sub) => sub.url);
      }
      if (data.hls) {
        if (data.hls.playlist) {
          streams.push(__spreadValues({
            server: `uniquestream (RAW - ${data.hls.locale || "unknown"})`,
            link: data.hls.playlist,
            type: "m3u8"
          }, softSubtitles.length > 0 && { subtitles: softSubtitles }));
        }
        if (data.hls.hard_subs && Array.isArray(data.hls.hard_subs)) {
          data.hls.hard_subs.forEach((sub) => {
            if (sub.locale === "en-US") {
              streams.push({
                server: `uniquestream (Sub - ${sub.locale})`,
                link: sub.playlist,
                type: "m3u8"
              });
            }
          });
        }
      }
      if (data.versions && data.versions.hls && Array.isArray(data.versions.hls)) {
        data.versions.hls.forEach((version) => {
          if (version.playlist && version.locale === "en-US") {
            streams.push({
              server: `uniquestream (Dub - ${version.locale})`,
              link: version.playlist,
              type: "m3u8"
            });
          }
        });
      }
      if (streams.length === 1 && streams[0].server.includes("RAW")) {
        if (((_a = data.hls) == null ? void 0 : _a.hard_subs) && Array.isArray(data.hls.hard_subs)) {
          data.hls.hard_subs.forEach((sub) => {
            if (sub.locale !== "en-US") {
              streams.push({
                server: `uniquestream (Sub - ${sub.locale})`,
                link: sub.playlist,
                type: "m3u8"
              });
            }
          });
        }
      }
      console.log("streams", streams);
      return streams;
    } catch (error) {
      console.error("uniquestream getStream failed", error);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

