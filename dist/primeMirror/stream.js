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

// providers/primeMirror/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  link: id,
  providerContext
}) {
  const { getBaseUrl } = providerContext;
  try {
    let providerValue = "primeMirror";
    const baseUrl = yield getBaseUrl("nfMirror");
    const url = `https://netmirror.8man.dev/api/net-proxy?url=${baseUrl}${providerValue === "netflixMirror" ? "/mobile/playlist.php?id=" : "/pv/playlist.php?id="}${id}&t=${Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3)}`;
    console.log("nfGetStream, url:", url);
    const res = yield fetch(url, {
      credentials: "omit"
    });
    const resJson = yield res.json();
    const data = resJson == null ? void 0 : resJson[0];
    const streamLinks = [];
    data == null ? void 0 : data.sources.forEach((source) => {
      var _a;
      streamLinks.push({
        server: source.label,
        link: ((_a = source.file) == null ? void 0 : _a.startsWith("http")) ? source.file : `${baseUrl}${source.file}`,
        type: "m3u8",
        headers: {
          Referer: baseUrl,
          origin: baseUrl,
          Cookie: "hd=on"
        }
      });
    });
    console.log(streamLinks);
    return streamLinks;
  } catch (err) {
    console.error(err);
    return [];
  }
}), "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

