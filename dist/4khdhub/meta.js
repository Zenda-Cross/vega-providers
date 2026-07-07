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

// providers/4khdhub/meta.ts
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
      const baseUrl = yield getBaseUrl("4khdhub");
      const url = `${baseUrl}${link}`;
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      const type = $(".season-content").length > 0 ? "series" : "movie";
      const imdbId = "";
      const title = $(".page-title").text() || "";
      const image = $(".poster-image").find("img").attr("src") || "";
      const synopsis = $(".content-section").find("p").first().text().trim() || "";
      const links = [];
      if (type === "series") {
        $(".season-item").map((i, element) => {
          const title2 = $(element).find(".episode-title").text();
          let directLinks = [];
          $(element).find(".episode-download-item").map((i2, element2) => {
            const title3 = $(element2).find(".episode-file-info").text().trim().replace("\n", " ");
            const link2 = $(element2).find(".episode-links").find("a:contains('HubCloud')").attr("href");
            if (title3 && link2) {
              directLinks.push({ title: title3, link: link2 });
            }
          });
          if (title2 && directLinks.length > 0) {
            links.push({
              title: title2,
              directLinks
            });
          }
        });
      } else {
        $(".download-item").map((i, element) => {
          const title2 = $(element).find(".flex-1.text-left.font-semibold").text().trim();
          const link2 = $(element).find(".grid.grid-cols-2.gap-2").find("a:contains('HubCloud')").attr("href");
          if (title2 && link2) {
            links.push({ title: title2, directLinks: [{ title: title2, link: link2 }] });
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

