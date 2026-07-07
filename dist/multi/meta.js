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

// providers/multi/meta.ts
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
      const { axios, cheerio } = providerContext;
      const url = link;
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      const type = url.includes("tvshows") ? "series" : "movie";
      const imdbId = "";
      const title = url.split("/")[4].replace(/-/g, " ");
      const image = $(".g-item").find("a").attr("href") || "";
      const synopsis = $(".wp-content").find("p").text() || "";
      const links = [];
      if (type === "series") {
        $("#seasons").children().map((i, element) => {
          const title2 = $(element).find(".title").children().remove().end().text();
          let episodesList = [];
          $(element).find(".episodios").children().map((i2, element2) => {
            const title3 = "Episode" + $(element2).find(".numerando").text().trim().split("-")[1];
            const link2 = $(element2).find("a").attr("href");
            if (title3 && link2) {
              episodesList.push({ title: title3, link: link2 });
            }
          });
          if (title2 && episodesList.length > 0) {
            links.push({
              title: title2,
              directLinks: episodesList
            });
          }
        });
      } else {
        links.push({
          title,
          directLinks: [{ title, link: url.slice(0, -1), type: "movie" }]
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

