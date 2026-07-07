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

// providers/mxplayer/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
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
var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    try {
      const { axios } = providerContext;
      const parts = link.split("*");
      const id = parts[0];
      const type = parts[1] || "episode";
      const url = `https://api.mxplayer.in/v1/web/detail/video?id=${id}&type=${type}&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.mxplayer.in/",
        "Origin": "https://www.mxplayer.in"
      };
      const res = yield axios.get(url, { headers });
      const videoData = res.data || {};
      const stream = videoData.stream || {};
      const hlsData = stream.hls || {};
      const dashData = stream.dash || {};
      const thirdParty = stream.thirdParty || {};
      const altBalaji = stream.altBalaji || {};
      const mxplay = stream.mxplay || {};
      let hls = hlsData.high || hlsData.base || hlsData.main || thirdParty.hlsUrl || altBalaji.hlsUrl || (mxplay.hls || {}).high;
      if (hls && !hls.startsWith("http")) {
        hls = `https://d3sgzbosmwirao.cloudfront.net/${hls}`;
      }
      let dash = dashData.high || dashData.base || dashData.main || thirdParty.dashUrl || altBalaji.dashUrl || (mxplay.dash || {}).high;
      if (dash && !dash.startsWith("http")) {
        dash = `https://d3sgzbosmwirao.cloudfront.net/${dash}`;
      }
      const streamsList = [];
      if (hls) {
        streamsList.push({
          server: "MXPlayer-HLS",
          link: hls,
          type: "m3u8"
        });
      }
      if (dash) {
        streamsList.push({
          server: "MXPlayer-DASH",
          link: dash,
          type: "mpd"
        });
      }
      return streamsList;
    } catch (err) {
      console.error("MXPlayer getStream error:", err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

