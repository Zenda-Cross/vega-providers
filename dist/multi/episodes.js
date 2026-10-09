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

// providers/multi/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    console.log("getEpisodeLinks", url);
    try {
      const res = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, headers), {
          Referer: url.split("/").slice(0, 3).join("/"),
          // Cookie may be needed for Cloudflare / bot protection
          cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t"
        })
      });
      const $ = cheerio.load(res.data);
      const seasonMatch = url.match(/\/season\/(\d+)/i) || url.match(/[?&]season=(\d+)/i);
      const season = seasonMatch == null ? void 0 : seasonMatch[1];
      let grid = season ? $(`#cinejoy-season-${season}`) : $(".cinejoy-season-grid.active");
      if (!grid.length) grid = $(".cinejoy-season-grid.active").first();
      if (!grid.length) grid = $(".cinejoy-season-grid").first();
      if ($(".cinejoy-episodes-section").length && grid.length) {
        const episodes2 = [];
        const baseUrl = url.split("/").slice(0, 3).join("/");
        grid.find(".cinejoy-ep-card").each((_, card) => {
          const el = $(card);
          const a = el.find("a.cinejoy-ep-thumb-link").first();
          let href = a.attr("href") || el.find("a.cinejoy-ep-name").first().attr("href") || "";
          if (!href) return;
          if (href.startsWith("/")) {
            href = baseUrl + href;
          }
          const epNo = el.find(".cinejoy-ep-badge-num").first().text().trim();
          const name = el.find(".cinejoy-ep-name").first().text().trim() || el.find(".cinejoy-ep-name").first().attr("title") || "";
          episodes2.push({
            title: epNo ? `${epNo} ${name}`.trim() : name,
            link: href
          });
        });
        if (episodes2.length) return episodes2;
      }
      const container = $(".entry-content,.entry-inner, .download-links-div");
      $(".unili-content,.code-block-1").remove();
      const episodes = [];
      container.find("h5").each((_, element) => {
        const el = $(element);
        const title = el.text().trim();
        const hubCloudLink = el.next(".downloads-btns-div").find(
          'a[style*="background: linear-gradient(135deg,#e629d0,#007bff);"]'
        ).attr("href");
        if (title && hubCloudLink) {
          episodes.push({
            title: title.replace(/[-:]/g, "").trim(),
            link: hubCloudLink
          });
        }
      });
      return episodes;
    } catch (err) {
      console.log("getEpisodeLinks error:", err);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

