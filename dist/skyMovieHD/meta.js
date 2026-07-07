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

// providers/skyMovieHD/meta.ts
var meta_exports = {};
__export(meta_exports, {
  fetchEpisodesFromSelectedLink: () => fetchEpisodesFromSelectedLink,
  getMeta: () => getMeta
});

var headers = {
  Referer: "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};
function fetchEpisodesFromSelectedLink(url, providerContext) {
  return __async(this, null, function* () {
    const { axios, cheerio } = providerContext;
    const res = yield axios.get(url, { headers });
    const $ = cheerio.load(res.data);
    const episodes = [];
    $("h4").each((_, h4El) => {
      const epTitle = $(h4El).text().trim();
      if (!epTitle) return;
      const directLinks = [];
      $(h4El).nextUntil("h4, hr").find("a[href]").each((_2, linkEl) => {
        let href = ($(linkEl).attr("href") || "").trim();
        if (!href) return;
        if (!href.startsWith("http")) href = new URL(href, url).href;
        const btnText = $(linkEl).text().trim() || "Watch Episode";
        directLinks.push({
          link: href,
          title: btnText,
          quality: "AUTO",
          type: "episode"
        });
      });
      if (directLinks.length > 0) {
        episodes.push({
          title: epTitle,
          directLinks
        });
      }
    });
    return episodes;
  });
}
__name(fetchEpisodesFromSelectedLink, "fetchEpisodesFromSelectedLink");
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b;
    const { axios, cheerio } = providerContext;
    if (!link.startsWith("http"))
      link = new URL(link, "https://vgmlinks.click").href;
    try {
      const res = yield axios.get(link, { headers });
      const $ = cheerio.load(res.data);
      const content = $(".entry-content, .post-inner").length ? $(".entry-content, .post-inner") : $("body");
      const title = $("h1.entry-title").first().text().trim() || ((_a = $("meta[property='og:title']").attr("content")) == null ? void 0 : _a.trim()) || "Unknown";
      const pageText = content.text();
      const type = /Season\s*\d+/i.test(pageText) || /Episode\s*\d+/i.test(pageText) ? "series" : "movie";
      let image = $(".poster img").attr("src") || $("meta[property='og:image']").attr("content") || $("meta[name='twitter:image']").attr("content") || "";
      if (image && !image.startsWith("http")) image = new URL(image, link).href;
      let synopsis = "";
      $(".entry-content p").each((_, el) => {
        const txt = $(el).text().trim();
        if (txt.length > 40 && !txt.toLowerCase().includes("download")) {
          synopsis = txt;
          return false;
        }
      });
      const imdbLink = $("a[href*='imdb.com']").attr("href") || "";
      const imdbId = imdbLink ? "tt" + (((_b = imdbLink.split("/tt")[1]) == null ? void 0 : _b.split("/")[0]) || "") : "";
      const tags = [];
      $(".entry-content p strong").each((_, el) => {
        const txt = $(el).text().trim();
        if (txt.match(
          /drama|biography|action|thriller|romance|adventure|animation/i
        ))
          tags.push(txt);
      });
      const extra = {};
      $("p").each((_, el) => {
        var _a2, _b2, _c, _d, _e, _f;
        const html = $(el).html() || "";
        if (html.includes("Series Name"))
          extra.name = (_a2 = $(el).text().split(":")[1]) == null ? void 0 : _a2.trim();
        if (html.includes("Language"))
          extra.language = (_b2 = $(el).text().split(":")[1]) == null ? void 0 : _b2.trim();
        if (html.includes("Released Year"))
          extra.year = (_c = $(el).text().split(":")[1]) == null ? void 0 : _c.trim();
        if (html.includes("Quality"))
          extra.quality = (_d = $(el).text().split(":")[1]) == null ? void 0 : _d.trim();
        if (html.includes("Episode Size"))
          extra.size = (_e = $(el).text().split(":")[1]) == null ? void 0 : _e.trim();
        if (html.includes("Format"))
          extra.format = (_f = $(el).text().split(":")[1]) == null ? void 0 : _f.trim();
      });
      const links = [];
      const episodeList = [];
      const isInformationalHeading = /* @__PURE__ */ __name((text) => {
        const lowerText = text.toLowerCase();
        return lowerText.includes("series info") || lowerText.includes("series name") || lowerText.includes("language") || lowerText.includes("released year") || lowerText.includes("episode size") || lowerText.includes("format") || lowerText.includes("imdb rating") || lowerText.includes("winding up") || lowerText.length < 5 && !/\d/.test(lowerText);
      }, "isInformationalHeading");
      if (type === "series") {
        content.find("h3").each((_, h3) => {
          var _a2;
          const h3Text = $(h3).text().trim();
          if (isInformationalHeading(h3Text)) return;
          const qualityMatch = ((_a2 = h3Text.match(/\d+p/)) == null ? void 0 : _a2[0]) || "AUTO";
          const vcloudLink = $(h3).nextUntil("h3, hr").find("a").filter((_2, a) => /v-cloud|mega|gdrive|download/i.test($(a).text())).first();
          const href = vcloudLink.attr("href");
          if (href) {
            const btnText = vcloudLink.text().trim() || "Link";
            if (btnText.toLowerCase().includes("imdb rating") || btnText.toLowerCase().includes("winding up"))
              return;
            links.push({
              title: h3Text,
              quality: qualityMatch,
              episodesLink: href
            });
          }
        });
      } else {
        content.find("h3, h5").each((_, heading) => {
          var _a2;
          const headingText = $(heading).text().trim();
          if (isInformationalHeading(headingText)) return;
          const qualityMatch = ((_a2 = headingText.match(/\d+p/)) == null ? void 0 : _a2[0]) || "AUTO";
          const linkEl = $(heading).nextUntil("h3, h5, hr").find("a[href]").first();
          const href = linkEl.attr("href");
          if (href) {
            let finalHref = href.trim();
            if (!finalHref.startsWith("http"))
              finalHref = new URL(finalHref, link).href;
            const btnText = linkEl.text().trim() || "Download Link";
            if (btnText.toLowerCase().includes("imdb rating") || btnText.toLowerCase().includes("winding up"))
              return;
            links.push({
              title: headingText,
              quality: qualityMatch,
              episodesLink: "",
              directLinks: [
                {
                  title: btnText,
                  link: finalHref,
                  type: "movie"
                }
              ]
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
        tags,
        cast: [],
        rating: $(".entry-meta .entry-date").text().trim() || "",
        linkList: links,
        extraInfo: extra,
        episodeList
      };
    } catch (err) {
      console.error("getMeta error:", err);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        tags: [],
        cast: [],
        rating: "",
        linkList: [],
        extraInfo: {},
        episodeList: []
      };
    }
  });
}, "getMeta");
exports.fetchEpisodesFromSelectedLink = fetchEpisodesFromSelectedLink;
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

