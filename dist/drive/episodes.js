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

// providers/drive/episodes.ts
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
      const { axios, cheerio } = providerContext;
      const res = yield axios.get(url);
      const html = res.data;
      let $ = cheerio.load(html);
      const episodeLinks = [];
      $('a:contains("HubCloud")').map((i, element) => {
        const title = $(element).parent().prev().text();
        const link = $(element).attr("href");
        if (link && (title.includes("Ep") || title.includes("Download"))) {
          episodeLinks.push({
            title: title.includes("Download") ? "Play" : title,
            link
          });
        }
      });
      if (episodeLinks.length === 0) {
        const streamingServices = ["hubcloud", "gdflix", "pixeldrain", "fastdl"];
        let currentTitle = "";
        $("body *").each((i, element) => {
          const tagName = element.tagName.toLowerCase();
          if (["h3", "h4", "h5", "h6", "strong"].includes(tagName)) {
            const text = $(element).text().trim();
            if (text && (text.match(/\d{3,4}p/) || text.match(/ep\d+/i) || text.match(/episode/i) || text.match(/season/i))) {
              if (!streamingServices.some((s) => text.toLowerCase().includes(s))) {
                currentTitle = text;
              }
            }
          }
          if (tagName === "a") {
            const href = $(element).attr("href");
            if (href && streamingServices.some((s) => href.includes(s))) {
              let serverName = "Play";
              if (href.includes("hubcloud")) serverName = "HubCloud";
              else if (href.includes("gdflix")) serverName = "GDFlix";
              else if (href.includes("pixeldrain")) serverName = "Pixeldrain";
              else if (href.includes("fastdl")) serverName = "FastDL";
              if (!episodeLinks.find((e) => e.link === href)) {
                episodeLinks.push({
                  title: currentTitle ? `${currentTitle} - ${serverName}` : serverName,
                  link: href
                });
              }
            }
          }
        });
      }
      if (episodeLinks.length === 0) {
        const hubcloudLink = (_a = html.match(
          /https:\/\/hubcloud\.[^\/]+\/drive\/[^"'\s]+/i
        )) == null ? void 0 : _a[0];
        if (hubcloudLink) {
          episodeLinks.push({ title: "Play", link: hubcloudLink });
        }
      }
      console.log("episodeLinks:", episodeLinks);
      return episodeLinks.length > 0 ? episodeLinks : [{ title: "Play", link: url }];
    } catch (err) {
      console.error(err);
      return [
        {
          title: "Server 1",
          link: url
        }
      ];
    }
  });
}, "getEpisodes");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

