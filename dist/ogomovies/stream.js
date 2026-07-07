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

// providers/ogomovies/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
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
  Cookie: "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
function getStream(_0) {
  return __async(this, arguments, function* ({
    link,
    type,
    signal,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    try {
      const streamLinks = [];
      const dotlinkRes = yield axios(`${link}`, { headers, signal });
      const dotlinkText = dotlinkRes.data;
      const buttonMatches = dotlinkText.matchAll(
        /download_video\('([^']+)','([^']+)','([^']+)'\)/g
      );
      for (const match of buttonMatches) {
        const [, id, mode, hash] = match;
        const dlUrl = `https://cdn.bewab.co/dl?op=download_orig&id=${id}&mode=${mode}&hash=${hash}`;
        try {
          const dlRes = yield axios(dlUrl, { headers, signal });
          const dlText = dlRes.data;
          const $$ = cheerio.load(dlText);
          const directMatches = dlText.matchAll(
            /<a\s+href="([^"]+\.(?:mkv|mp4))"/gi
          );
          for (const m of directMatches) {
            const href = m[1];
            if (href) {
              streamLinks.push({
                server: "direct",
                link: href,
                type: href.endsWith(".mp4") ? "mp4" : "mkv"
              });
            }
          }
          $$("a").each((_, el) => {
            var _a;
            const href = (_a = $$(el).attr("href")) != null ? _a : null;
            if (href && (href.includes(".mkv") || href.includes(".mp4"))) {
              streamLinks.push({
                server: "direct",
                link: href,
                type: href.endsWith(".mp4") ? "mp4" : "mkv"
              });
            }
          });
        } catch (err) {
          console.log("\u274C error loading dl page:", err.message);
        }
      }
      return streamLinks;
    } catch (error) {
      console.log("getStream error: ", error.message);
      return [];
    }
  });
}
__name(getStream, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

