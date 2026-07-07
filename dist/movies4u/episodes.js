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

// providers/movies4u/episodes.ts
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
      let res = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, headers), {
          // Cloudflare/Bot protection के लिए Hardcoded cookie यहाँ आवश्यक हो सकता है
          cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t"
        })
      });
      if (res.data && res.data.includes("Please turn JavaScript on and reload the page.")) {
        const b1Match = res.data.match(/var b1=atob\(['"]([^'"]+)['"]\)/);
        const a2Match = res.data.match(/_0x2aa8=\[['"]([^'"]+)['"]\]/);
        const c3Match = res.data.match(/c3=toNumbers\(['"]([^'"]+)['"]\)/);
        if (b1Match && a2Match && c3Match) {
          const unescapeHexStr = /* @__PURE__ */ __name((str) => str.replace(
            /\\x([0-9A-Fa-f]{2})/g,
            (_, hex) => String.fromCharCode(parseInt(hex, 16))
          ), "unescapeHexStr");
          const baseUrl = url.split("/").slice(0, 3).join("/");
          const minJsRes = yield axios.get(`${baseUrl}/min.js`, {
            headers
          });
          const b1Hex = atob(unescapeHexStr(b1Match[1]));
          const a2Hex = atob(unescapeHexStr(a2Match[1]));
          const c3Hex = unescapeHexStr(c3Match[1]);
          const solver = new Function(
            "c3Hex",
            "a1Hex",
            "b2Hex",
            `
          ${minJsRes.data}
          function toNumbers(d){var e=[];d.replace(/(..)/g,function(d){e.push(parseInt(d,16))});return e}
          function toHex(){for(var d=[],d=1==arguments.length&&arguments[0].constructor==Array?arguments[0]:arguments,e='',f=0;f<d.length;f++)e+=(16>d[f]?'0':'')+d[f].toString(16);return e.toLowerCase()}
          return toHex(slowAES.decrypt(toNumbers(c3Hex), 2, toNumbers(a1Hex), toNumbers(b2Hex)));
        `
          );
          const decrypted = solver(c3Hex, a2Hex, b1Hex);
          const newCookie = `Antiddos-systems-DH=${decrypted}`;
          res = yield axios.get(url, {
            headers: __spreadProps(__spreadValues({}, headers), { Cookie: newCookie })
          });
        }
      }
      const $ = cheerio.load(res.data);
      const container = $(".entry-content,.entry-inner, .download-links-div");
      $(".unili-content,.code-block-1").remove();
      const episodes = [];
      const hElements = container.find("h3, h4, h5, p");
      hElements.each((index, element) => {
        const el = $(element);
        const title = el.text().trim();
        const downloadButtons = el.nextAll().find("a").first();
        const link = downloadButtons.attr("href");
        if (title && link && title.match(/Episode|Ep|E\d+/i) && title.length < 150) {
          const cleanedTitle = title.replace(/[-:]/g, "").trim();
          if (!episodes.some((e) => e.link === link)) {
            episodes.push({
              title: cleanedTitle,
              link
            });
          }
        }
      });
      if (episodes.length === 0) {
        $("a").each((i, el) => {
          const href = $(el).attr("href");
          if (href && (href.includes("mdrive") || href.includes("fastdl") || href.includes("filebee") || href.includes("gdflix"))) {
            const title = $(el).parent().prev().text().trim() || $(el).text().trim() || `Episode ${i + 1}`;
            if (!episodes.some((e) => e.link === href)) {
              episodes.push({
                title: title.replace(/[-:]/g, "").trim(),
                link: href
              });
            }
          }
        });
      }
      return episodes;
    } catch (err) {
      console.log("getEpisodeLinks error: ");
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

