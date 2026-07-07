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

// providers/movies4u/meta.ts
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
    var _a, _b;
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
      let response = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl })
      });
      if (response.data && response.data.includes("Please turn JavaScript on and reload the page.")) {
        const b1Match = response.data.match(/var b1=atob\(['"]([^'"]+)['"]\)/);
        const a2Match = response.data.match(/_0x2aa8=\[['"]([^'"]+)['"]\]/);
        const c3Match = response.data.match(/c3=toNumbers\(['"]([^'"]+)['"]\)/);
        if (b1Match && a2Match && c3Match) {
          const unescapeHexStr = /* @__PURE__ */ __name((str) => str.replace(
            /\\x([0-9A-Fa-f]{2})/g,
            (_, hex) => String.fromCharCode(parseInt(hex, 16))
          ), "unescapeHexStr");
          const minJsRes = yield axios.get(`${baseUrl}/min.js`, {
            headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl })
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
          response = yield axios.get(url, {
            headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl, Cookie: newCookie })
          });
        }
      }
      const $ = cheerio.load(response.data);
      const infoContainer = $(".entry-content, .post-inner").length ? $(".entry-content, .post-inner") : $("body");
      const result = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
      const infoParagraph = $("h2.movie-title").next("p").text();
      if (infoParagraph.includes("Season:") || infoParagraph.includes("Episode:") || infoParagraph.includes("SHOW Name:")) {
        result.type = "series";
      } else {
        result.type = "movie";
      }
      const rawTitle = $("h1").text().trim() || $("h2").text().trim();
      result.title = rawTitle.split(/\[| \d+p| x\d+/)[0].trim();
      const showNameMatch = infoParagraph.match(/SHOW Name: (.+)/) || infoParagraph.match(/Name: (.+)/);
      if (showNameMatch && showNameMatch[1]) {
        result.title = result.title || showNameMatch[1].trim();
      }
      const imdbMatch = ((_a = infoContainer.html()) == null ? void 0 : _a.match(/tt\d+/)) || ((_b = $("a[href*='imdb.com/title/']").attr("href")) == null ? void 0 : _b.match(/tt\d+/));
      result.imdbId = imdbMatch ? imdbMatch[0] : "";
      let image = infoContainer.find(".post-thumbnail img").attr("src") || infoContainer.find("img[src]").first().attr("src") || "";
      if (image.startsWith("//")) image = "https:" + image;
      else if (image.startsWith("/")) image = baseUrl + image;
      if (image.includes("no-thumbnail") || image.includes("placeholder"))
        image = "";
      result.image = image;
      const links = [];
      const hElements = infoContainer.find("h3, h4, p");
      hElements.each((index, element) => {
        var _a2;
        const el = $(element);
        const titleText = el.text().trim();
        const qualityMatch = (_a2 = titleText.match(/\d+p\b/)) == null ? void 0 : _a2[0];
        const fullTitle = titleText;
        const downloadButtons = el.nextAll().find("a").first();
        if (downloadButtons.length && qualityMatch && titleText.length < 350) {
          if (result.type === "series") {
            links.push({
              title: fullTitle,
              quality: qualityMatch,
              episodesLink: downloadButtons.attr("href") || "",
              directLinks: []
            });
          } else {
            const directLinks = [];
            const link2 = downloadButtons.attr("href");
            if (link2) {
              directLinks.push({
                title: downloadButtons.text().trim() || "Download",
                link: link2,
                type: "movie"
                // literal type
              });
            }
            if (directLinks.length) {
              links.push({
                title: fullTitle,
                quality: qualityMatch,
                episodesLink: "",
                directLinks
              });
            }
          }
        }
      });
      const uniqueLinks = /* @__PURE__ */ new Map();
      links.forEach((link2) => {
        var _a2, _b2;
        const href = link2.episodesLink || ((_b2 = (_a2 = link2.directLinks) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.link);
        if (href && !uniqueLinks.has(href)) {
          uniqueLinks.set(href, link2);
        }
      });
      result.linkList = Array.from(uniqueLinks.values());
      return result;
    } catch (err) {
      console.log("getMeta error:", err);
      return emptyResult;
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

