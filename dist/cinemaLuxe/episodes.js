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

// providers/cinemaLuxe/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url,
    providerContext
  }) {
    var _a;
    try {
      if (!url.includes("luxelinks") || url.includes("cinemalux")) {
        const res2 = yield providerContext.axios.get(url, {
          headers: providerContext.commonHeaders
        });
        const data = res2.data;
        const encodedLink = (_a = data.match(/"link":"([^"]+)"/)) == null ? void 0 : _a[1];
        if (encodedLink) {
          url = encodedLink ? atob(encodedLink) : url;
        } else {
          const redirectUrlRes = yield fetch(
            "https://cm-decrypt.8man.workers.dev/cinemaluxe",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ url })
            }
          );
          const redirectUrl = yield redirectUrlRes.json();
          url = (redirectUrl == null ? void 0 : redirectUrl.redirectUrl) || url;
        }
      }
      const episodeLinks = [];
      if (url.includes("luxedrive") || url.includes("drive.linkstore")) {
        episodeLinks.push({
          title: "Movie",
          link: url
        });
        return episodeLinks;
      }
      const res = yield providerContext.axios.get(url, {
        headers: providerContext.commonHeaders
      });
      const html = res.data;
      let $ = providerContext.cheerio.load(html);
      $("a.maxbutton-4,a.maxbutton,.maxbutton-hubcloud,.ep-simple-button").map(
        (i, element) => {
          var _a2;
          const title = (_a2 = $(element).text()) == null ? void 0 : _a2.trim();
          const link = $(element).attr("href");
          if (title && link && !title.includes("Batch") && !title.toLowerCase().includes("zip")) {
            episodeLinks.push({
              title: title.replace(/\(\d{4}\)/, "").replace("Download", "Movie").replace("\u26A1", "").trim(),
              link
            });
          }
        }
      );
      return episodeLinks;
    } catch (err) {
      console.error("cl episode links", err);
      return [];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

