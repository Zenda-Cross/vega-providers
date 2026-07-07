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

// providers/showbox/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    try {
      const { axios, cheerio, getBaseUrl } = providerContext;
      const baseUrlShowbox = yield getBaseUrl("showbox");
      const url = baseUrlShowbox + link;
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      const type = url.includes("tv") ? "series" : "movie";
      const imdbId = "";
      const title = $(".heading-name").text();
      const rating = ((_b = (_a = $(".btn-imdb").text()) == null ? void 0 : _a.match(/\d+(\.\d+)?/g)) == null ? void 0 : _b[0]) || "";
      const image = ((_d = (_c = $(".cover_follow").attr("style")) == null ? void 0 : _c.split("url(")[1]) == null ? void 0 : _d.split(")")[0]) || "";
      const synopsis = (_f = (_e = $(".description").text()) == null ? void 0 : _e.replace(/[\n\t]/g, "")) == null ? void 0 : _f.trim();
      const febID = (_h = (_g = $(".heading-name").find("a").attr("href")) == null ? void 0 : _g.split("/")) == null ? void 0 : _h.pop();
      const baseUrl = url.split("/").slice(0, 3).join("/");
      const indexUrl = `${baseUrl}/index/share_link?id=${febID}&type=${type === "movie" ? "1" : "2"}`;
      const indexRes = yield axios.get(indexUrl);
      const indexData = indexRes.data;
      const febKey = indexData.data.link.split("/").pop();
      const febLink = `https://www.febbox.com/file/file_share_list?share_key=${febKey}&is_html=0`;
      const febRes = yield axios.get(febLink);
      const febData = febRes.data;
      const fileList = (_i = febData == null ? void 0 : febData.data) == null ? void 0 : _i.file_list;
      const links = [];
      if (fileList) {
        fileList.map((file) => {
          const fileName = `${file.file_name} (${file.file_size})`;
          const fileId = file.fid;
          links.push({
            title: fileName,
            episodesLink: file.is_dir ? `${febKey}&${fileId}` : `${febKey}&`
          });
        });
      }
      return {
        title,
        rating,
        synopsis,
        image,
        imdbId,
        type,
        linkList: links
      };
    } catch (err) {
      console.error("Error fetching metadata:", err);
      return {
        title: "",
        rating: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

