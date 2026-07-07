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

// providers/katMovieFix/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta,
  scrapeEpisodePage: () => scrapeEpisodePage
});

var headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    return axios.get(link, { headers }).then((response) => {
      var _a;
      const $ = cheerio.load(response.data);
      const infoContainer = $(".entry-content,.post-inner");
      const title = $("h1.entry-title").text().trim() || $("h2.entry-title").text().trim() || "";
      const imdbMatch = (_a = infoContainer.html()) == null ? void 0 : _a.match(/tt\d+/);
      const imdbId = imdbMatch ? imdbMatch[0] : "";
      const synopsis = infoContainer.find("h3:contains('SYNOPSIS'), h3:contains('synopsis')").next("p").text().trim() || "";
      let image = infoContainer.find("img").first().attr("src") || "";
      if (image.startsWith("//")) image = "https:" + image;
      const type = /Season \d+/i.test(infoContainer.text()) ? "series" : "movie";
      const linkList = [];
      if (type === "series") {
        infoContainer.find("h2 a").each((_, el) => {
          var _a2;
          const el$ = $(el);
          const href = (_a2 = el$.attr("href")) == null ? void 0 : _a2.trim();
          const linkText = el$.text().trim();
          if (href && linkText.includes("Single Episode")) {
            linkList.push({
              title: linkText,
              episodesLink: href,
              directLinks: []
            });
          }
        });
      } else {
        infoContainer.find("a[href]").each((_, aEl) => {
          var _a2;
          const el$ = $(aEl);
          const href = ((_a2 = el$.attr("href")) == null ? void 0 : _a2.trim()) || "";
          if (!href) return;
          const btnText = el$.text().trim() || "Download";
          linkList.push({
            title: btnText,
            directLinks: [{ title: btnText, link: href, type: "movie" }],
            episodesLink: ""
          });
        });
      }
      return { title, synopsis, image, imdbId, type, linkList };
    }).catch((err) => {
      console.error("getMeta error:", err);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: []
      };
    });
  });
}, "getMeta");
var scrapeEpisodePage = /* @__PURE__ */ __name(function({
  link,
  providerContext
}) {
  const { axios, cheerio } = providerContext;
  const result = [];
  return axios.get(link, { headers }).then((response) => {
    const $ = cheerio.load(response.data);
    $(".entry-content,.post-inner").find("h3 a").each((_, el) => {
      var _a;
      const el$ = $(el);
      const href = (_a = el$.attr("href")) == null ? void 0 : _a.trim();
      const btnText = el$.text().trim() || "Download";
      if (href) result.push({ title: btnText, link: href, type: "series" });
    });
    return result;
  }).catch((err) => {
    console.error("scrapeEpisodePage error:", err);
    return result;
  });
}, "scrapeEpisodePage");
exports.getMeta = getMeta;
exports.scrapeEpisodePage = scrapeEpisodePage;
// Annotate the CommonJS export names for ESM import in node:

