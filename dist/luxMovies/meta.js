"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// providers/luxMovies/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie: "_ga=GA1.1.10613951.1756380104; xla=s4t; _ga_1CG5NQ0F53=GS2.1.s1756380103$o1$g1$t1756380120$j43$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
var getMeta = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  link,
  providerContext
}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
  try {
    const { axios, cheerio } = providerContext;
    const url = link;
    console.log("url", url);
    const baseUrl = url.split("/").slice(0, 3).join("/");
    const response = yield axios.get(url, {
      headers: __spreadProps(__spreadValues({}, headers), {
        Referer: baseUrl
      })
    });
    const $ = cheerio.load(response.data);
    const infoContainer = $(
      ".entry-content, .post-inner, .post-content, .page-body"
    );
    let title = $("h1.post-title").text().trim();
    if (!title) {
      const heading2 = infoContainer == null ? void 0 : infoContainer.find("h3");
      const titleRegex = /Name: (.+)/;
      title = ((_c = (_b = (_a = heading2 == null ? void 0 : heading2.next("p")) == null ? void 0 : _a.text()) == null ? void 0 : _b.match(titleRegex)) == null ? void 0 : _c[1]) || "";
    }
    let imdbId = ((_e = (_d = $('a[href*="imdb.com"]').attr("href")) == null ? void 0 : _d.match(/tt\d+/)) == null ? void 0 : _e[0]) || "";
    if (!imdbId) {
      const heading2 = infoContainer == null ? void 0 : infoContainer.find("h3");
      imdbId = //@ts-ignore
      ((_k = (_j = (_i = (_h = (_g = (_f = heading2 == null ? void 0 : heading2.next("p")) == null ? void 0 : _f.find("a")) == null ? void 0 : _g[0]) == null ? void 0 : _h.attribs) == null ? void 0 : _i.href) == null ? void 0 : _j.match(/tt\d+/g)) == null ? void 0 : _k[0]) || ((_l = infoContainer.text().match(/tt\d+/g)) == null ? void 0 : _l[0]) || "";
    }
    let type = "movie";
    const heading = infoContainer == null ? void 0 : infoContainer.find("h3");
    if ((_n = (_m = heading == null ? void 0 : heading.next("p")) == null ? void 0 : _m.text()) == null ? void 0 : _n.includes("Series Name")) {
      type = "series";
    }
    let synopsis = "";
    const synopsisHeader = $("h3").filter(
      (i, el) => $(el).text().includes("SYNOPSIS/PLOT") || $(el).text().includes("Plot")
    );
    if (synopsisHeader.length > 0) {
      synopsis = synopsisHeader.next("p").text().trim();
    }
    if (!synopsis) {
      const synopsisNode = (
        //@ts-ignore
        (_s = (_r = (_q = (_p = (_o = infoContainer == null ? void 0 : infoContainer.find("p")) == null ? void 0 : _o.next("h3,h4")) == null ? void 0 : _p.next("p")) == null ? void 0 : _q[0]) == null ? void 0 : _r.children) == null ? void 0 : _s[0]
      );
      synopsis = synopsisNode && "data" in synopsisNode ? synopsisNode.data : "";
    }
    let image = ((_t = infoContainer == null ? void 0 : infoContainer.find("img[data-lazy-src]")) == null ? void 0 : _t.attr("data-lazy-src")) || ((_w = (_v = (_u = infoContainer == null ? void 0 : infoContainer.find("img")) == null ? void 0 : _u.filter((i, el) => {
      const src = $(el).attr("src");
      return !!src && !src.includes("logo") && !src.includes("svg") && !src.includes("placeholder") && !src.includes("icon");
    })) == null ? void 0 : _v.first()) == null ? void 0 : _w.attr("src")) || "";
    if (image.startsWith("//")) {
      image = "https:" + image;
    }
    console.log({ title, synopsis, image, imdbId, type });
    let hr = (_x = infoContainer == null ? void 0 : infoContainer.first()) == null ? void 0 : _x.find("hr");
    const firstButton = $(".dwd-button").first();
    if (firstButton.length > 0) {
      const containerP = firstButton.closest("p");
      let prev = containerP.prev();
      while (prev.length && !prev.is("hr")) {
        prev = prev.prev();
      }
      if (prev.is("hr")) {
        hr = prev;
      }
    }
    const list = hr == null ? void 0 : hr.nextUntil("hr");
    const links = [];
    list.each((index, element) => {
      var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2;
      element = $(element);
      const title2 = (element == null ? void 0 : element.text()) || "";
      const quality = ((_a2 = element == null ? void 0 : element.text().match(/\d+p\b/)) == null ? void 0 : _a2[0]) || "";
      const movieLinks = (element == null ? void 0 : element.next().find(".dwd-button").text().toLowerCase().includes("download")) || element.next().find("a").text().toLowerCase().includes("download") ? ((_c2 = (_b2 = element == null ? void 0 : element.next().find(".dwd-button")) == null ? void 0 : _b2.parent()) == null ? void 0 : _c2.attr("href")) || ((_d2 = element == null ? void 0 : element.next().find("a[href]")) == null ? void 0 : _d2.attr("href")) : "";
      const vcloudLinks = (_f2 = (_e2 = element == null ? void 0 : element.next().find(
        ".btn-outline[style='background:linear-gradient(135deg,#ed0b0b,#f2d152); color: white;'],.btn-outline[style='background:linear-gradient(135deg,#ed0b0b,#f2d152); color: #fdf8f2;'],.btn-outline[style='background:linear-gradient(135deg,#ed0b0b,#f2d152);color: white']"
      )) == null ? void 0 : _e2.parent()) == null ? void 0 : _f2.attr("href");
      const episodesLink = (vcloudLinks ? vcloudLinks : (element == null ? void 0 : element.next().find(".dwd-button").text().toLowerCase().includes("episode")) ? (_h2 = (_g2 = element == null ? void 0 : element.next().find(".dwd-button")) == null ? void 0 : _g2.parent()) == null ? void 0 : _h2.attr("href") : "") || ((_j2 = (_i2 = element == null ? void 0 : element.next().find(
        ".btn-outline[style='background:linear-gradient(135deg,#0ebac3,#09d261); color: white;']"
      )) == null ? void 0 : _i2.parent()) == null ? void 0 : _j2.attr("href"));
      if (movieLinks || episodesLink) {
        links.push({
          title: title2,
          directLinks: movieLinks ? [{ title: "Movie", link: movieLinks, type: "movie" }] : [],
          episodesLink,
          quality
        });
      }
    });
    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links
    };
  } catch (error) {
    console.log("getInfo error");
    console.error(error);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "",
      linkList: []
    };
  }
}), "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

