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

// providers/moviezwap/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    try {
      const { axios, cheerio, getBaseUrl } = providerContext;
      const baseUrl = yield getBaseUrl("moviezwap");
      const url = link.startsWith("http") ? link : `${baseUrl}${link}`;
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      let image = $('img[width="260"]').attr("src") || "";
      if (image && !image.startsWith("http")) {
        image = baseUrl + image;
      }
      const tags = $("font[color='steelblue']").map((i, el) => $(el).text().trim()).get().slice(0, 2);
      const title = $("title").text().replace(" - MoviezWap", "").trim() || "";
      let synopsis = "";
      let imdbId = "";
      let type = "movie";
      let infoRows = [];
      $("td:contains('Movie Information')").parent().nextAll("tr").each((i, el) => {
        const tds = $(el).find("td");
        if (tds.length === 2) {
          const key = tds.eq(0).text().trim();
          const value = tds.eq(1).text().trim();
          infoRows.push(`${key}: ${value}`);
          if (key.toLowerCase().includes("plot")) synopsis = value;
          if (key.toLowerCase().includes("imdb")) imdbId = value;
        }
      });
      if (!synopsis) {
        synopsis = $("p:contains('plot')").text().trim();
      }
      const links = [];
      $('a[href*="download.php?file="], a[href*="dwload.php?file="]').each(
        (i, el) => {
          var _a;
          const downloadPage = ((_a = $(el).attr("href")) == null ? void 0 : _a.replace("dwload.php", "download.php")) || "";
          const text = $(el).text().trim();
          if (downloadPage && /\d+p/i.test(text)) {
            links.push({
              title: text,
              directLinks: [{ title: "Movie", link: baseUrl + downloadPage }]
            });
          }
        }
      );
      $("img[src*='/images/play.png']").each((i, el) => {
        const downloadPage = $(el).siblings("a").attr("href");
        const text = $(el).siblings("a").text().trim();
        console.log("Found link:\u{1F525}\u{1F525}", text, downloadPage);
        if (downloadPage && text) {
          links.push({
            title: text,
            episodesLink: baseUrl + downloadPage
          });
        }
      });
      return {
        title,
        synopsis,
        image,
        imdbId,
        tags,
        type,
        linkList: links
        //info: infoRows.join("\n"),
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

