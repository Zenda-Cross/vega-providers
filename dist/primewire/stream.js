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

// providers/primewire/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: url,
    type,
    providerContext
  }) {
    var _a, _b, _c, _d, _e, _f;
    const { axios, cheerio } = providerContext;
    try {
      console.log("pwGetStream", type, url);
      const baseUrl = url.split("/").slice(0, 3).join("/");
      const streamLinks = [];
      const urls = [];
      const res = yield axios.get(url);
      const data = res.data;
      const $ = cheerio.load(data);
      $('tr:contains("mixdrop")').map((i, element) => {
        const id = $(element).find(".wp-menu-btn").attr("data-wp-menu");
        const size = $(element).find(".wp-menu-btn").next().text();
        if (id) {
          urls.push({ id: baseUrl + "/links/go/" + id, size });
        }
      });
      console.log("urls", urls);
      for (const url2 of urls) {
        const res2 = yield axios.head(url2.id);
        const location = (_a = res2.request) == null ? void 0 : _a.responseURL.replace("/f/", "/e/");
        const res3 = yield fetch(location, {
          credentials: "include",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "iframe",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
            referer: (_b = res2.request) == null ? void 0 : _b.responseURL
          },
          referrer: (_c = res2.request) == null ? void 0 : _c.responseURL,
          method: "GET",
          mode: "cors"
        });
        const data3 = yield res3.text();
        var functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
        var match = functionRegex.exec(data3);
        let p = "";
        if (match) {
          var encodedString = match[2];
          console.log("Encoded String:", encodedString);
          const base = Number(
            encodedString.split(",'|MDCore|")[0].split(",")[encodedString.split(",'|MDCore|")[0].split(",").length - 1]
          );
          console.log("Base:", base);
          p = (_d = encodedString.split(`',${base},`)) == null ? void 0 : _d[0].trim();
          let a = base;
          let c = encodedString.split(`',${base},`)[1].slice(2).split("|").length;
          let k = encodedString.split(`',${base},`)[1].slice(2).split("|");
          const decode = /* @__PURE__ */ __name(function(p2, a2, c2, k2, e, d) {
            e = /* @__PURE__ */ __name(function(c3) {
              return c3.toString(36);
            }, "e");
            if (!"".replace(/^/, String)) {
              while (c2--) {
                d[c2.toString(a2)] = k2[c2] || c2.toString(a2);
              }
              k2 = [
                function(e2) {
                  return d[e2];
                }
              ];
              e = /* @__PURE__ */ __name(function() {
                return "\\w+";
              }, "e");
              c2 = 1;
            }
            while (c2--) {
              if (k2[c2]) {
                p2 = p2.replace(new RegExp("\\b" + e(c2) + "\\b", "g"), k2[c2]);
              }
            }
            return p2;
          }, "decode");
          const decoded = decode(p, a, c, k, 0, {});
          const wurl = (_e = decoded.match(/MDCore\.wurl="([^"]+)"/)) == null ? void 0 : _e[1];
          console.log("wurl:", wurl);
          const streamUrl = "https:" + wurl;
          console.log("streamUrl:", streamUrl);
          streamLinks.push({
            server: "Mixdrop " + url2.size,
            link: streamUrl,
            type: "mp4",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              "Upgrade-Insecure-Requests": "1",
              "Sec-Fetch-Dest": "iframe",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "same-origin",
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
              referer: (_f = res2.request) == null ? void 0 : _f.responseURL
            }
          });
        } else {
          console.log("No match found");
        }
      }
      return streamLinks;
    } catch (err) {
      console.error(err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

