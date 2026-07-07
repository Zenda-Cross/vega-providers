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

// providers/protonMovies/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b, _c, _d, _e;
    try {
      let decodeHtml2 = function(encodedArray) {
        const joined = encodedArray.join("");
        const unescaped = joined.replace(/\\"/g, '"').replace(/\\'/g, "'");
        const cleaned = unescaped.replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\r/g, "\r");
        const decoded = cleaned.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        return decoded;
      };
      var decodeHtml = decodeHtml2;
      __name(decodeHtml2, "decodeHtml");
      const { axios, cheerio, getBaseUrl } = providerContext;
      const baseUrl = yield getBaseUrl("protonMovies");
      console.log("all", link);
      const res = yield axios.get(`${baseUrl}${link}`);
      const data = res.data;
      const $$ = cheerio.load(data);
      const htmlArray = (_e = (_d = (_c = (_b = (_a = $$('script:contains("decodeURIComponent")').text().split(" = ")) == null ? void 0 : _a[1]) == null ? void 0 : _b.split("protomovies")) == null ? void 0 : _c[0]) == null ? void 0 : _d.trim()) == null ? void 0 : _e.slice(0, -1);
      const html = decodeHtml2(JSON.parse(htmlArray));
      const $ = cheerio.load(html);
      const title = $(
        ".trending-text.fw-bold.texture-text.text-uppercase.my-0.fadeInLeft.animated.d-inline-block"
      ).text();
      const image = $("#thumbnail").attr("src");
      const type = link.includes("series") ? "series" : "movie";
      const synopsis = $(".col-12.iq-mb-30.animated.fadeIn").first().text() || $(".description-content").text();
      const tags = $(".p-0.mt-2.list-inline.d-flex.flex-wrap.movie-tag").find("li").map((i, el) => $(el).text()).slice(0, 3).get();
      const links = [];
      if (type === "movie") {
        const directLinks = [];
        directLinks.push({ title: "Movie", link: baseUrl + link });
        links.push({ title: "Movie", directLinks });
      } else {
        $("#episodes").children().map((i, element) => {
          let directLinks = [];
          $(element).find(".episode-block").map((j, ep) => {
            const link2 = baseUrl + $(ep).find("a").attr("href") || "";
            const title2 = "Episode " + $(ep).find(".episode-number").text().split("E")[1];
            directLinks.push({ title: title2, link: link2 });
          });
          links.push({ title: "Season " + (i + 1), directLinks });
        });
      }
      return {
        image: image || "",
        imdbId: "",
        linkList: links,
        title: title || "",
        synopsis,
        tags,
        type
      };
    } catch (err) {
      console.error("prton", err);
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

