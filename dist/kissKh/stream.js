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

// providers/kissKh/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: id,
    providerContext
  }) {
    var _a, _b, _c;
    try {
      const { axios, getBaseUrl } = providerContext;
      const streamLinks = [];
      const subtitles = [];
      const baseUrl = yield getBaseUrl("kissKh");
      const streamUrl = "https://adorable-salamander-ecbb21.netlify.app/api/kisskh/video?id=" + id;
      const res = yield axios.get(streamUrl);
      const stream = (_b = (_a = res.data) == null ? void 0 : _a.source) == null ? void 0 : _b.Video;
      const subData = (_c = res.data) == null ? void 0 : _c.subtitles;
      subData == null ? void 0 : subData.map((sub) => {
        var _a2;
        subtitles.push({
          title: sub == null ? void 0 : sub.label,
          language: sub == null ? void 0 : sub.land,
          type: ((_a2 = sub == null ? void 0 : sub.src) == null ? void 0 : _a2.includes(".vtt")) ? "text/vtt" : "application/x-subrip",
          uri: sub == null ? void 0 : sub.src
        });
      });
      streamLinks.push({
        server: "kissKh",
        link: stream,
        type: (stream == null ? void 0 : stream.includes(".mp4")) ? "mp4" : "m3u8",
        headers: {
          referer: baseUrl
        }
      });
      return streamLinks;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

