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

// providers/uhd/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
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
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a;
    try {
      const { axios, cheerio, openWebView, commonHeaders } = providerContext;
      console.log("Fetching metadata from UHD...", link, providerContext);
      const url = link;
      const res = yield getWithWAF(url, axios, openWebView, commonHeaders);
      const html = yield res.data;
      const $ = cheerio.load(html);
      const title = $("h2:first").text() || "";
      const image = $("h2").siblings().find("img").attr("src") || "";
      const episodes = [];
      $(".mks_separator,p:contains('mks_separator')").each((index, element) => {
        $(element).nextUntil(".mks_separator").each((index2, element2) => {
          const title2 = $(element2).text();
          const episodesList = [];
          $(element2).next("p").find("a").each((index3, element3) => {
            const title3 = $(element3).text();
            const link2 = $(element3).attr("href");
            if (title3 && link2 && !title3.toLocaleLowerCase().includes("zip")) {
              episodesList.push({ title: title3, link: link2 });
            }
          });
          if (title2 && episodesList.length > 0) {
            episodes.push({
              title: title2,
              directLinks: episodesList
            });
          }
        });
      });
      $("hr").each((index, element) => {
        $(element).nextUntil("hr").each((index2, element2) => {
          const title2 = $(element2).text();
          const episodesList = [];
          $(element2).next("p").find("a").each((index3, element3) => {
            const title3 = $(element3).text();
            const link2 = $(element3).attr("href");
            if (title3 && link2 && !title3.toLocaleLowerCase().includes("zip")) {
              episodesList.push({ title: title3, link: link2 });
            }
          });
          if (title2 && episodesList.length > 0) {
            episodes.push({
              title: title2,
              directLinks: episodesList
            });
          }
        });
      });
      return {
        title: title.match(/^Download\s+([^(\[]+)/i) ? ((_a = title == null ? void 0 : title.match(/^Download\s+([^(\[]+)/i)) == null ? void 0 : _a[1]) || "" : title.replace("Download", "") || "",
        image,
        imdbId: "",
        synopsis: title,
        type: "",
        linkList: episodes
      };
    } catch (error) {
      console.error(error);
      return {
        title: "",
        image: "",
        imdbId: "",
        synopsis: "",
        linkList: [],
        type: "uhd"
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

