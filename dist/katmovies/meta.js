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

// providers/katmovies/meta.ts
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
          force: true,
          waitForCookie: "cf_clearance"
        });
        return yield axios.get(url, {
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl, Cookie: wafResult.cookies })
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
      const url = link;
      const res = yield getWithWAF(url, axios, openWebView, commonHeaders);
      const data = res.data;
      const $ = cheerio.load(data);
      const container = $(".yQ8hqd.ksSzJd.LoQAYe").html() ? $(".yQ8hqd.ksSzJd.LoQAYe") : $(".FxvUNb");
      const imdbId = ((_a = container.find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])').attr("href")) == null ? void 0 : _a.split("/")[4]) || "";
      const title = container.find('li:contains("Name")').children().remove().end().text();
      const type = $(".yQ8hqd.ksSzJd.LoQAYe").html() ? "series" : "movie";
      const synopsis = container.find('li:contains("Stars")').text();
      const image = $('h4:contains("SCREENSHOTS")').next().find("img").attr("src") || "";
      console.log("katGetInfo", title, synopsis, image, imdbId, type);
      const links = [];
      const directLink = [];
      $(".entry-content").find('p:contains("Episode")').each((i, element) => {
        const dlLink = $(element).nextAll("h3,h2").first().find('a:contains("1080"),a:contains("720"),a:contains("480")').attr("href") || "";
        const dlTitle = $(element).find("span").text();
        if (link.trim().length > 0 && dlTitle.includes("Episode ")) {
          directLink.push({
            title: dlTitle,
            link: dlLink
          });
        }
      });
      if (directLink.length > 0) {
        links.push({
          quality: "",
          title,
          directLinks: directLink
        });
      }
      $(".entry-content").find("pre").nextUntil("div").filter("h2").each((i, element) => {
        var _a2;
        const link2 = $(element).find("a").attr("href");
        const quality = ((_a2 = $(element).text().match(/\b(480p|720p|1080p|2160p)\b/i)) == null ? void 0 : _a2[0]) || "";
        const title2 = $(element).text();
        if (link2 && title2.includes("")) {
          links.push({
            quality,
            title: title2,
            episodesLink: link2
          });
        }
      });
      if (links.length === 0 && type === "movie") {
        $(".entry-content").find('h2:contains("DOWNLOAD"),h3:contains("DOWNLOAD")').nextUntil("pre,div").filter("h2").each((i, element) => {
          var _a2;
          const link2 = $(element).find("a").attr("href");
          const quality = ((_a2 = $(element).text().match(/\b(480p|720p|1080p|2160p)\b/i)) == null ? void 0 : _a2[0]) || "";
          const title2 = $(element).text();
          if (link2 && !title2.includes("Online")) {
            links.push({
              quality,
              title: title2,
              directLinks: [{ link: link2, title: title2, type: "movie" }]
            });
          }
        });
      }
      return {
        title,
        synopsis,
        image,
        imdbId,
        type,
        linkList: links
      };
    } catch (err) {
      console.error(err);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

