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

// providers/cinemaLuxe/meta.ts
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
      const url = link;
      const res = yield providerContext.axios.get(url, {
        headers: providerContext.commonHeaders
      });
      const data = res.data;
      const $ = providerContext.cheerio.load(data);
      const type = url.includes("tvshows") ? "series" : "movie";
      const imdbId = "";
      const title = url.split("/")[4].replace(/-/g, " ");
      const image = $(".g-item").find("a").attr("href") || "";
      const synopsis = $(".wp-content").text().trim();
      const tags = $(".sgeneros").children().map((i, element) => $(element).text()).get().slice(3);
      const rating = Number($("#repimdb").find("strong").text()).toFixed(1).toString();
      const links = [];
      $(".custom-links").find(".ep-button-container").map((i, element) => {
        var _a;
        const title2 = $(element).text().replace("\u2B07Download", "").replace("\u2B07 Download", "").trim();
        const link2 = $(element).find("a").attr("href");
        if (title2 && link2) {
          links.push({
            title: title2,
            episodesLink: link2,
            quality: ((_a = title2 == null ? void 0 : title2.match(/\d+P\b/)) == null ? void 0 : _a[0].replace("P", "p")) || ""
          });
        }
      });
      if (links.length === 0) {
        $(
          ".ep-button-container:not(:has(a:contains('Click Here To Visit')))"
        ).map((i, element) => {
          var _a;
          let title2 = $(element).find("a").text().replace("\u2B07Download", "").replace("\u2B07 Download", "").trim();
          if (title2.includes("Download Now")) {
            title2 = $(element).parent().find("h3").text().trim().replace("\u2B07Download", "").replace("\u2B07 Download", "");
          }
          const link2 = $(element).find("a").attr("href");
          if (title2 && link2) {
            links.push({
              title: title2,
              episodesLink: link2,
              quality: ((_a = title2 == null ? void 0 : title2.match(/\d+P\b/)) == null ? void 0 : _a[0].replace("P", "p")) || ""
            });
          }
        });
      }
      return {
        title,
        tags,
        rating,
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

