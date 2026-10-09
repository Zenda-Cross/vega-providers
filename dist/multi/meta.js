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

// providers/multi/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie: "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a;
    const { axios, cheerio } = providerContext;
    const url = link;
    const baseUrl = url.split("/").slice(0, 3).join("/");
    const emptyResult = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: []
    };
    try {
      const response = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl })
      });
      const $ = cheerio.load(response.data);
      const result = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
      let watchItem = null;
      let watchConfig = null;
      $("script").each((_, el) => {
        const txt = $(el).html() || "";
        const itemMatch = txt.match(
          /const\s+watchItem\s*=\s*(\{[\s\S]*?\})\s*;/
        );
        if (itemMatch && !watchItem) {
          try {
            watchItem = JSON.parse(itemMatch[1]);
          } catch (_2) {
          }
        }
        const cfgMatch = txt.match(
          /const\s+watchConfig\s*=\s*(\{[\s\S]*?\})\s*;/
        );
        if (cfgMatch && !watchConfig) {
          try {
            watchConfig = JSON.parse(cfgMatch[1]);
          } catch (_2) {
          }
        }
      });
      result.title = ((_a = watchItem == null ? void 0 : watchItem.title) == null ? void 0 : _a.toString().trim()) || $(".cinejoy-detail-title").first().text().trim() || $(".watch-details-summary").first().text().trim() || "Unknown Title";
      result.image = (watchItem == null ? void 0 : watchItem.poster) || $(".watch-bg img").first().attr("src") || $(".cinejoy-detail-poster img").first().attr("src") || "";
      result.synopsis = $("#cinejoyOverview").first().text().trim() || $(".cinejoy-detail-overview").first().text().trim() || "";
      const hasCinejoyEpisodes = $(".cinejoy-episodes-section").length > 0;
      result.type = (watchItem == null ? void 0 : watchItem.type) === "tv" || hasCinejoyEpisodes ? "tv" : "movie";
      result.imdbId = "";
      const linkList = [];
      if (result.type === "tv" || hasCinejoyEpisodes) {
        const seriesBase = url.split("?")[0].replace(/\/$/, "").replace(/\/season\/\d+(\/episode\/\d+)?$/i, "").replace(/\/episode\/\d+$/i, "");
        const seasonMap = /* @__PURE__ */ new Map();
        $(".cinejoy-season-select option").each((_, opt) => {
          const season = ($(opt).attr("value") || "").trim();
          if (!season) return;
          const label = $(opt).text().trim() || `Season ${season}`;
          seasonMap.set(season, {
            title: label,
            // Use query-string style URL
            episodesLink: `${seriesBase}?season=${season}`
          });
        });
        $(".cinejoy-season-grid").each((_, grid) => {
          const id = $(grid).attr("id") || "";
          const m = id.match(/cinejoy-season-(\d+)/);
          if (!m) return;
          const season = m[1];
          if (seasonMap.has(season)) return;
          seasonMap.set(season, {
            title: `Season ${season}`,
            episodesLink: `${seriesBase}?season=${season}`
          });
        });
        if (seasonMap.size > 0) {
          seasonMap.forEach((value) => {
            linkList.push({
              title: value.title,
              quality: "",
              episodesLink: value.episodesLink,
              directLinks: []
            });
          });
        } else {
          linkList.push({
            title: "Season 1",
            quality: "",
            episodesLink: `${seriesBase}?season=1`,
            directLinks: []
          });
        }
      } else {
        linkList.push({
          title: result.title,
          quality: "",
          episodesLink: url,
          directLinks: [
            {
              title: result.title,
              link: url,
              type: "movie"
            }
          ]
        });
      }
      result.linkList = linkList;
      return result;
    } catch (err) {
      console.log("getMeta error:", err);
      return emptyResult;
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

