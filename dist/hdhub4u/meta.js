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

// providers/hdhub4u/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var hdbHeaders = {
  Cookie: "xla=s4t",
  Referer: "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a;
    try {
      const { axios, cheerio } = providerContext;
      const url = link;
      const res = yield axios.get(url, { headers: hdbHeaders });
      const data = res.data;
      const $ = cheerio.load(data);
      const container = $(".page-body");
      const imdbId = ((_a = container.find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])').attr("href")) == null ? void 0 : _a.split("/")[4]) || "";
      const title = container.find(
        'h2[data-ved="2ahUKEwjL0NrBk4vnAhWlH7cAHRCeAlwQ3B0oATAfegQIFBAM"],h2[data-ved="2ahUKEwiP0pGdlermAhUFYVAKHV8tAmgQ3B0oATAZegQIDhAM"]'
      ).text();
      const type = title.toLocaleLowerCase().includes("season") ? "series" : "movie";
      const synopsis = container.find('strong:contains("DESCRIPTION")').parent().text().replace("DESCRIPTION:", "");
      const image = container.find('img[decoding="async"]').attr("src") || "";
      const links = [];
      const directLink = [];
      $('strong:contains("EPiSODE")').map((i, element) => {
        const epTitle = $(element).parent().parent().text();
        const episodesLink = $(element).parent().parent().parent().next().next().find("a").attr("href") || $(element).parent().parent().parent().next().find("a").attr("href");
        if (episodesLink && episodesLink) {
          directLink.push({
            title: epTitle,
            link: episodesLink
          });
        }
      });
      if (directLink.length === 0) {
        container.find('a:contains("EPiSODE")').map((i, element) => {
          const epTitle = $(element).text();
          const episodesLink = $(element).attr("href");
          if (episodesLink) {
            directLink.push({
              title: epTitle.toLocaleUpperCase(),
              link: episodesLink
            });
          }
        });
      }
      if (directLink.length > 0) {
        links.push({
          title,
          directLinks: directLink
        });
      }
      if (directLink.length === 0) {
        container.find(
          'a:contains("480"),a:contains("720"),a:contains("1080"),a:contains("2160"),a:contains("4K")'
        ).map((i, element) => {
          var _a2;
          const quality = ((_a2 = $(element).text().match(/\b(480p|720p|1080p|2160p)\b/i)) == null ? void 0 : _a2[0]) || "";
          const movieLinks = $(element).attr("href");
          const title2 = $(element).text();
          if (movieLinks) {
            links.push({
              directLinks: [
                { link: movieLinks, title: "Movie", type: "movie" }
              ],
              quality,
              title: title2
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

