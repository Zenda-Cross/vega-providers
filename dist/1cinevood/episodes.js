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

// providers/1cinevood/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

function getWithWAF(url, axios, openWebView, headers) {
  return __async(this, null, function* () {
    var _a;
    const baseUrl = url.split("/").slice(0, 3).join("/");
    try {
      return yield axios.get(url, { headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }) });
    } catch (error) {
      if (((_a = error.response) == null ? void 0 : _a.status) === 403 && openWebView) {
        console.log(`WAF detected (403) for ${url}, using solver...`);
        const wafResult = yield openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass anti-bot protection.",
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }),
          waitForCookie: "cf_clearance",
          force: true
        });
        return yield axios.get(url, {
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl, Cookie: wafResult.cookie })
        });
      }
      throw error;
    }
  });
}
__name(getWithWAF, "getWithWAF");
var formatEpisodeTitle = /* @__PURE__ */ __name((fileName) => {
  try {
    const match = fileName.match(/S(\d+)E(\d+)/i);
    if (match) {
      const season = match[1].padStart(2, "0");
      const episode = match[2].padStart(2, "0");
      return `S${season} E${episode}`;
    }
    return fileName;
  } catch (e) {
    return fileName;
  }
}, "formatEpisodeTitle");
var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    var _a, _b, _c, _d;
    const { axios, cheerio, commonHeaders: headers, openWebView } = providerContext;
    console.log("getEpisodeLinks", url);
    try {
      const baseUrl = url.split("/").slice(0, 3).join("/");
      const id = url.split("/").filter(Boolean).pop() || "";
      const apiUrl = `${baseUrl}/api/packs/${id}`;
      console.log("apiUrl:", apiUrl);
      let res;
      try {
        res = yield getWithWAF(apiUrl, axios, openWebView, headers);
      } catch (error) {
        if (((_a = error.response) == null ? void 0 : _a.status) === 404) {
          const alternativeUrl = `${baseUrl}/api/s/${id}/`;
          console.log("Trying alternative URL:", alternativeUrl);
          const altRes = yield getWithWAF(alternativeUrl, axios, openWebView, headers);
          if ((_b = altRes.data) == null ? void 0 : _b.hasHubcloud) {
            const hubcloudUrl = `${baseUrl}/api/s/${id}/hubcloud`;
            return [
              {
                title: formatEpisodeTitle(altRes.data.fileName || "Movie"),
                link: hubcloudUrl
              }
            ];
          }
          return [];
        }
        throw error;
      }
      const episodes = [];
      const items = ((_d = (_c = res.data) == null ? void 0 : _c.pack) == null ? void 0 : _d.items) || [];
      for (const item of items) {
        if (item.file_name && item.hubcloud_link) {
          episodes.push({
            title: formatEpisodeTitle(item.file_name),
            link: item.hubcloud_link
          });
        }
      }
      return episodes;
    } catch (err) {
      throw err;
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

