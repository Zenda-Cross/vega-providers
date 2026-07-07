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

// providers/zeefliz/meta.ts
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
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
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
      const content = $(".entry-content, .post-inner").length ? $(".entry-content, .post-inner") : $("body");
      const result = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
      let rawTitle = content.find("h1, h2").first().text().trim();
      rawTitle = rawTitle.replace(/^Download\s*/i, "");
      result.title = rawTitle;
      const pageText = content.text();
      if (/Season\s*\d+/i.test(pageText) || /Episode\s*\d+/i.test(pageText)) {
        result.type = "series";
      } else {
        result.type = "movie";
      }
      const imdbHref = content.find("a[href*='imdb.com/title/']").attr("href");
      const imdbMatch = imdbHref == null ? void 0 : imdbHref.match(/tt\d+/);
      result.imdbId = imdbMatch ? imdbMatch[0] : "";
      let image = content.find("img").first().attr("data-src") || content.find("img").first().attr("src") || "";
      if (image.startsWith("//")) image = "https:" + image;
      else if (image.startsWith("/")) image = baseUrl + image;
      if (image.includes("no-thumbnail") || image.includes("placeholder"))
        image = "";
      result.image = image;
      result.synopsis = content.find("p").first().text().trim() || "";
      const links = [];
      const pickDownloadHref = /* @__PURE__ */ __name((heading) => {
        const anchors = $(heading).nextUntil("h2, h3, h4, h5, h6").find("a[href]").add($(heading).next().find("a[href]"));
        let preferred = "";
        let firstHttp = "";
        anchors.each((_, a) => {
          const aHref = $(a).attr("href") || "";
          if (!/^https?:/i.test(aHref)) return;
          if (!firstHttp) firstHttp = aHref;
          const hay = `${$(a).text()} ${aHref}`.toLowerCase();
          if (!preferred && /download|v-cloud|vcloud|nexdrive|hubcloud|gdflix|drive|cloud|fast/i.test(
            hay
          )) {
            preferred = aHref;
          }
        });
        return preferred || firstHttp;
      }, "pickDownloadHref");
      if (result.type === "series") {
        content.find("h3").each((_, h3) => {
          var _a;
          const h3Text = $(h3).text().trim();
          const qualityMatch = ((_a = h3Text.match(/\d+p/)) == null ? void 0 : _a[0]) || "";
          const vcloudLink = $(h3).next("p").find("a").filter((_2, a) => /v-cloud/i.test($(a).text())).first();
          const href = vcloudLink.attr("href");
          if (href) {
            links.push({
              title: h3Text,
              quality: qualityMatch,
              episodesLink: href,
              // Episode button
              directLinks: []
              // Empty for series
            });
          }
        });
        if (links.length === 0) {
          content.find("h3, h4, h5, h6").each((_, h) => {
            var _a;
            const hText = $(h).text().trim();
            const qualityMatch = (_a = hText.match(/\d{3,4}p/)) == null ? void 0 : _a[0];
            if (!qualityMatch) return;
            const href = pickDownloadHref(h);
            if (href) {
              links.push({
                title: hText,
                quality: qualityMatch,
                episodesLink: "",
                // Resolve through the same dotlink/cloud flow used for movies.
                directLinks: [{ title: hText, link: href, type: "movie" }]
              });
            }
          });
        }
      } else {
        content.find("h5").each((_, h5) => {
          var _a;
          const h5Text = $(h5).text().trim();
          const qualityMatch = ((_a = h5Text.match(/\d+p/)) == null ? void 0 : _a[0]) || "";
          const href = $(h5).next("p").find("a").attr("href");
          if (href) {
            links.push({
              title: h5Text,
              quality: qualityMatch,
              episodesLink: "",
              directLinks: [
                { title: "Movie", link: href, type: "movie" }
                // Play/Download button
              ]
            });
          }
        });
      }
      result.linkList = links;
      return result;
    } catch (err) {
      console.error("getMeta error:", err instanceof Error ? err.message : err);
      return emptyResult;
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

