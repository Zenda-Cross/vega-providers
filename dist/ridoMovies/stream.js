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

// providers/ridoMovies/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  link: data,
  providerContext
}) {
  var _a, _b;
  try {
    const { cheerio, commonHeaders: headers, axios } = providerContext;
    const streamData = JSON.parse(data);
    const streamLinks = [];
    const url = (streamData == null ? void 0 : streamData.baseUrl) + "/api/" + (streamData == null ? void 0 : streamData.slug);
    console.log("rido url", url);
    const res = yield axios.get(url, { headers });
    const iframe = (_b = (_a = res.data.data) == null ? void 0 : _a[0]) == null ? void 0 : _b.url;
    console.log("rido data", iframe);
    const iframeUrl = iframe.split('src="')[1].split('"')[0];
    console.log("rido iframeUrl", iframeUrl);
    const iframeRes = yield axios.get(iframeUrl, {
      headers: __spreadProps(__spreadValues({}, headers), {
        Referer: streamData == null ? void 0 : streamData.baseUrl
      })
    });
    const $ = cheerio.load(iframeRes.data);
    const script = $('script:contains("eval")').html();
    if (!script) {
      throw new Error("Unable to find script");
    }
    const srcUrl = unpackJavaScript(script.trim());
    console.log("rido srcUrl", srcUrl);
    streamLinks.push({
      link: srcUrl,
      server: "rido",
      type: "m3u8",
      headers: {
        Referer: iframeUrl
      }
    });
    return streamLinks;
  } catch (e) {
    console.log("rido get stream err", e);
    return [];
  }
}), "getStream");
function unpackJavaScript(packedCode) {
  const encodedString = packedCode.split("|aHR")[1].split("|")[0];
  const base64Url = "aHR" + encodedString;
  function addPadding(base64) {
    return base64 + "=".repeat((4 - base64.length % 4) % 4);
  }
  __name(addPadding, "addPadding");
  console.log("rido base64Url", base64Url);
  const unpackedCode = atob(addPadding(base64Url));
  return unpackedCode;
}
__name(unpackJavaScript, "unpackJavaScript");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

