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

// providers/getBaseUrl.ts
var getBaseUrl_exports = {};
__export(getBaseUrl_exports, {
  getBaseUrl: () => getBaseUrl
});
module.exports = __toCommonJS(getBaseUrl_exports);
var expireTime = 60 * 60 * 1e3;
var getBaseUrl = /* @__PURE__ */ __name((providerValue) => __async(null, null, function* () {
  var _a;
  try {
    let baseUrl = "";
    const cacheKey = "CacheBaseUrl" + providerValue;
    const timeKey = "baseUrlTime" + providerValue;
    const baseUrlRes = yield fetch(
      "https://himanshu8443.github.io/providers/modflix.json"
    );
    const baseUrlData = yield baseUrlRes.json();
    baseUrl = ((_a = baseUrlData[providerValue]) == null ? void 0 : _a.url) || (providerValue === "katdrama" ? "https://new.katdrama.my" : providerValue === "kdhindidubbed" ? "https://kdhindidubbed.cfd" : providerValue === "kdramasmaza" ? "https://kdramasmaza.net" : "");
    return baseUrl;
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    return providerValue === "katdrama" ? "https://new.katdrama.my" : providerValue === "kdhindidubbed" ? "https://kdhindidubbed.cfd" : providerValue === "kdramasmaza" ? "https://kdramasmaza.net" : "";
  }
}), "getBaseUrl");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getBaseUrl
});
