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

// providers/animetsu/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
      const { axios, openWebView, commonHeaders } = providerContext;
      const baseUrl = "https://animetsu.net";
      const url = `${baseUrl}/v2/api/anime/info/${link}`;
      let cookies;
      let res;
      try {
        res = yield axios.get(url, {
          headers: __spreadProps(__spreadValues({}, commonHeaders), { Referer: baseUrl })
        });
      } catch (error) {
        if (((_a = error.response) == null ? void 0 : _a.status) === 403) {
          const wafResult = yield openWebView(baseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass Animetsu anti-bot protection.",
            headers: __spreadProps(__spreadValues({}, commonHeaders), { Referer: baseUrl }),
            force: true,
            waitForCookie: "cf_clearance"
          });
          cookies = wafResult.cookies;
          res = yield axios.get(url, {
            headers: __spreadProps(__spreadValues({}, commonHeaders), { Referer: baseUrl, Cookie: cookies })
          });
        } else {
          throw error;
        }
      }
      const data = res.data;
      const meta = {
        title: ((_b = data.title) == null ? void 0 : _b.english) || ((_c = data.title) == null ? void 0 : _c.romaji) || ((_d = data.title) == null ? void 0 : _d.native) || "",
        synopsis: data.description || "",
        image: ((_e = data.cover_image) == null ? void 0 : _e.large) || ((_f = data.cover_image) == null ? void 0 : _f.medium) || ((_g = data.cover_image) == null ? void 0 : _g.small) || "",
        tags: [data == null ? void 0 : data.format, data == null ? void 0 : data.status, ...(data == null ? void 0 : data.genres) || []].filter(
          Boolean
        ),
        imdbId: "",
        type: data.format === "MOVIE" ? "movie" : "series"
      };
      const linkList = [];
      const seasons = data.seasons;
      if (seasons && seasons.length > 0) {
        yield Promise.all(
          seasons.map((season) => __async(null, null, function* () {
            var _a2, _b2, _c2;
            const seasonTitle = ((_a2 = season.title) == null ? void 0 : _a2.english) || ((_b2 = season.title) == null ? void 0 : _b2.romaji) || ((_c2 = season.title) == null ? void 0 : _c2.native);
            const directLinks = [];
            try {
              const epsRes = yield axios.get(
                `${baseUrl}/v2/api/anime/eps/${season.id}`,
                {
                  headers: __spreadValues(__spreadProps(__spreadValues({}, commonHeaders), {
                    Referer: baseUrl
                  }), cookies ? { Cookie: cookies } : {})
                }
              );
              const episodes = epsRes.data;
              if (episodes && episodes.length > 0) {
                episodes.forEach((ep) => {
                  directLinks.push({
                    title: `Episode ${ep.ep_num}`,
                    link: `${season.id}:${ep.ep_num}`
                  });
                });
              }
            } catch (e) {
              const total = season.total_eps || 1;
              for (let i = 1; i <= total; i++) {
                directLinks.push({
                  title: `Episode ${i}`,
                  link: `${season.id}:${i}`
                });
              }
            }
            if (directLinks.length > 0) {
              linkList.push({
                title: seasonTitle || meta.title,
                directLinks
              });
            }
          }))
        );
      } else {
        const total = data.total_eps || 1;
        const directLinks = [];
        for (let i = 1; i <= total; i++) {
          directLinks.push({
            title: total === 1 ? "Movie" : `Episode ${i}`,
            link: `${link}:${i}`
          });
        }
        linkList.push({ title: meta.title, directLinks });
      }
      return __spreadProps(__spreadValues({}, meta), {
        linkList
      });
    } catch (err) {
      console.error("animetsu meta error:", err);
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

