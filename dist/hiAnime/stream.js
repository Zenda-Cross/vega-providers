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

// providers/hiAnime/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: id,
    providerContext
  }) {
    try {
      const { getBaseUrl, axios } = providerContext;
      const baseUrl = yield getBaseUrl("consumet");
      const servers = ["vidcloud", "vidstreaming"];
      const url = `${baseUrl}/anime/zoro/watch?episodeId=${id}&server=`;
      const streamLinks = [];
      yield Promise.all(
        servers.map((server) => __async(null, null, function* () {
          var _a, _b;
          try {
            const res = yield axios.get(url + server);
            if (res.data) {
              const subtitles = [];
              (_a = res.data) == null ? void 0 : _a.subtitles.forEach((sub) => {
                var _a2, _b2;
                if ((sub == null ? void 0 : sub.lang) === "Thumbnails") return;
                subtitles.push({
                  language: ((_a2 = sub == null ? void 0 : sub.lang) == null ? void 0 : _a2.slice(0, 2)) || "Und",
                  uri: sub == null ? void 0 : sub.url,
                  title: (sub == null ? void 0 : sub.lang) || "Undefined",
                  type: ((_b2 = sub == null ? void 0 : sub.url) == null ? void 0 : _b2.endsWith(".vtt")) ? "text/vtt" : "application/x-subrip"
                });
              });
              (_b = res.data) == null ? void 0 : _b.sources.forEach((source) => {
                streamLinks.push({
                  server,
                  link: source == null ? void 0 : source.url,
                  type: (source == null ? void 0 : source.isM3U8) ? "m3u8" : "mp4",
                  headers: {
                    Referer: "https://megacloud.club/",
                    Origin: "https://megacloud.club"
                  },
                  subtitles
                });
              });
            }
          } catch (e) {
            console.log(e);
          }
        }))
      );
      return streamLinks;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

