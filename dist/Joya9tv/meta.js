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

// providers/Joya9tv/meta.ts
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
    const { cheerio } = providerContext;
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
      const response = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl })
      });
      const data = yield response.text();
      const $ = cheerio.load(data);
      const infoContainer = $(".content.right").first();
      const result = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
      if (/S\d+|Season \d+|TV Series\/Shows/i.test(
        infoContainer.find("h1").text() + $(".sgeneros").text()
      )) {
        result.type = "series";
      } else {
        result.type = "movie";
      }
      const rawTitle = $("h1").first().text().trim();
      let finalTitle = rawTitle.replace(/ Download.*|\[Episode \d+ Added\]/g, "").trim();
      finalTitle = finalTitle.split(/\(2025\)| S\d+/i)[0].trim() || "Unknown Title";
      result.title = finalTitle;
      const imdbMatch = (_a = infoContainer.html()) == null ? void 0 : _a.match(/tt\d+/);
      result.imdbId = imdbMatch ? imdbMatch[0] : "";
      let image = infoContainer.find(".poster img[src]").first().attr("src") || "";
      if (image.startsWith("//")) image = "https:" + image;
      if (image.includes("no-thumbnail") || image.includes("placeholder"))
        image = "";
      result.image = image;
      result.synopsis = $("#info .wp-content").text().trim() || "";
      const links = [];
      const downloadTable = $("#download .links_table table tbody");
      downloadTable.find("tr").each((index, element) => {
        var _a2;
        const row = $(element);
        const quality = row.find("strong.quality").text().trim();
        const size = row.find("td:nth-child(4)").text().trim();
        const directLinkAnchor = row.find("td a").first();
        const directLink = directLinkAnchor.attr("href");
        const linkTitle = directLinkAnchor.text().trim();
        if (quality && directLink) {
          const assertedType = result.type;
          const directLinks = [
            {
              title: linkTitle || "Download Link",
              link: directLink,
              type: assertedType
              // Use the asserted type
            }
          ];
          const seasonMatch = (_a2 = rawTitle.match(/S(\d+)/)) == null ? void 0 : _a2[1];
          let fullTitle = `${result.title}`;
          if (seasonMatch) fullTitle += ` Season ${seasonMatch}`;
          fullTitle += ` - ${quality}`;
          if (size) fullTitle += ` (${size})`;
          links.push({
            title: fullTitle,
            quality: quality.replace(/[^0-9p]/g, ""),
            // Clean to just 480p, 720p, 1080p
            // The direct link is to a page that lists all episodes, so it acts as the episodesLink
            directLinks
          });
        }
      });
      result.linkList = links;
      return result;
    } catch (err) {
      console.log("getMeta error:", err);
      return emptyResult;
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

