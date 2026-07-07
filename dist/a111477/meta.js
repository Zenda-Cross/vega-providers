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

// providers/a111477/meta.ts
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
      const pageTitle = $("h1").text().trim() || url.split("/").filter(Boolean).pop() || "";
      const title = pageTitle.replace("Index of /", "").replace(/\/$/, "");
      const links = [];
      const directLinks = [];
      $("table tbody tr").each((i, element) => {
        const $row = $(element);
        const linkElement = $row.find("td:first-child a");
        const itemTitle = linkElement.text().trim();
        const itemLink = linkElement.attr("href");
        if (itemTitle && itemLink && itemTitle !== "../" && itemTitle !== "Parent Directory") {
          const fullLink = itemLink;
          if (itemTitle.endsWith("/")) {
            const cleanTitle = itemTitle.replace(/\/$/, "");
            links.push({
              episodesLink: link + itemLink,
              title: cleanTitle
            });
          } else if (itemTitle.includes(".mp4") || itemTitle.includes(".mkv") || itemTitle.includes(".avi") || itemTitle.includes(".mov")) {
            directLinks.push({
              title: itemTitle,
              link: fullLink
            });
          }
        }
      });
      if (directLinks.length > 0) {
        links.push({
          title: title + " (Direct Files)",
          directLinks
        });
      }
      const type = links.some(
        (link2) => {
          var _a, _b;
          return ((_a = link2.episodesLink) == null ? void 0 : _a.includes("Season")) || ((_b = link2.episodesLink) == null ? void 0 : _b.includes("S0"));
        }
      ) ? "series" : directLinks.length > 1 ? "series" : "movie";
      return {
        title,
        synopsis: `Content from 111477.xyz directory`,
        image: `https://placehold.jp/23/000000/ffffff/300x450.png?text=${encodeURIComponent(
          title
        )}&css=%7B%22background%22%3A%22%20-webkit-gradient(linear%2C%20left%20bottom%2C%20left%20top%2C%20from(%233f3b3b)%2C%20to(%23000000))%22%2C%22text-transform%22%3A%22%20capitalize%22%7D`,
        imdbId: "",
        type,
        linkList: links
      };
    } catch (err) {
      console.error("111477 meta error:", err);
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

