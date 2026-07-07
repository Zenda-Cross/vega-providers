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

// providers/world4u/stream.ts
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
    var _a;
    const { axios, cheerio } = providerContext;
    const headers = {
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      Cookie: "61cn=1; 61wk=1; __cf_bm=wtv9Eoa2wrUDgevtAnJ6wUOZrxtVYBcddhUDtT0Wj_M-1757137848-1.0.1.1-8Tr7rV19zNgUcRYe_5567LKb2IZrKyxwrc1VWgTmMDd06Givhil3U2kMtUYTYkTnuD3sHUgfh8CO9Y5LrEcZACBbrPE.3Sq5F_JLXaK7Hrw; conv_tracking_data-2=%7B%22mf_source%22%3A%22regular_download-59%22%2C%22mf_content%22%3A%22Free%22%2C%22mf_medium%22%3A%22unknown%5C%2FDefault%20Browser%22%2C%22mf_campaign%22%3A%22616qpccbrq0y4oe%22%2C%22mf_term%22%3A%22d11b8f533377139aa38d757e5057630e%22%7D; ukey=pu2dyp35fyongstav3km969l8d6u2z82"
    };
    try {
      if (type === "movie") {
        const linkRes = yield axios.get(url, { headers });
        const linkData = linkRes.data;
        const $2 = cheerio.load(linkData);
        url = $2('strong:contains("INSTANT")').parent().attr("href") || url;
      }
      if (url.includes("fastilinks")) {
        const fastilinksRes = yield axios.get(url, { headers });
        const fastilinksData = fastilinksRes.data;
        const $$ = cheerio.load(fastilinksData);
        const fastilinksKey = $$(
          'input[name="_csrf_token_645a83a41868941e4692aa31e7235f2"]'
        ).attr("value");
        console.log("fastilinksKey", fastilinksKey);
        const fastilinksFormData = new FormData();
        fastilinksFormData.append(
          "_csrf_token_645a83a41868941e4692aa31e7235f2",
          fastilinksKey || ""
        );
        console.log(
          "fastilinksFormData",
          fastilinksFormData,
          "fastilinksUrl",
          url
        );
        const fastilinksRes2 = yield fetch(url, {
          method: "POST",
          headers,
          body: fastilinksFormData
        });
        const fastilinksHtml = yield fastilinksRes2.text();
        const $$$ = cheerio.load(fastilinksHtml);
        const fastilinksLink = $$$('a:contains("mediafire")').attr("href") || $$$('a:contains("photolinx")').attr("href");
        console.log("fastilinksLink", fastilinksLink);
        url = fastilinksLink || url;
      }
      console.log("world4uGetStream", type, url);
      if (url.includes("photolinx")) {
        console.log("photolinx", url);
        const photolinxBaseUrl = url.split("/").slice(0, 3).join("/");
        console.log("photolinxBaseUrl", photolinxBaseUrl);
        const photolinxRes = yield fetch(
          "https://photolinx.space/download/SzbPKzt6YMO",
          {
            headers: {
              accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
              "cache-control": "no-cache",
              pragma: "no-cache",
              priority: "u=0, i",
              "sec-ch-ua": '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": '"Windows"',
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "none",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1",
              cookie: "PHPSESSID=f2211def7938d7228daaa37ffeabcfe0; ext_name=ojplmecpdpgccookcobabopnaifgidhf"
            },
            body: null,
            method: "GET"
          }
        );
        const photolinxData = yield photolinxRes.text();
        const $$$ = cheerio.load(photolinxData);
        const access_token = $$$("#generate_url").attr("data-token");
        const uid = $$$("#generate_url").attr("data-uid");
        const body = {
          type: "DOWNLOAD_GENERATE",
          payload: {
            access_token,
            uid
          }
        };
        console.log("photolinxData", JSON.stringify(body));
        const photolinxRes2 = yield fetch(`${photolinxBaseUrl}/action`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
            "cache-control": "no-cache",
            "content-type": "application/json; charset=UTF-8",
            pragma: "no-cache",
            priority: "u=1, i",
            "sec-ch-ua": '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "xmlhttprequest",
            cookie: "PHPSESSID=f2211def7938d7228daaa37ffeabcfe0; ext_name=ojplmecpdpgccookcobabopnaifgidhf",
            Referer: url
          },
          body: JSON.stringify(body),
          method: "POST"
        });
        const photolinxData2 = yield photolinxRes2.json();
        console.log("photolinxData2", photolinxData2);
        const dwUrl = photolinxData2 == null ? void 0 : photolinxData2.download_url;
        if (dwUrl) {
          const streamLinks2 = [
            {
              server: "Photolinx",
              link: dwUrl,
              type: "mkv"
            }
          ];
          return streamLinks2;
        }
      }
      const res = yield fetch(url, { headers });
      const html = yield res.text();
      const streamLinks = [];
      let data = { download: "" };
      try {
        const key = ((_a = html.match(/formData\.append\('key',\s*'(\d+)'\);/)) == null ? void 0 : _a[1]) || "";
        console.log("key", key, "url", url);
        const formData = new FormData();
        formData.append("key", key);
        const streamRes = yield fetch(url, {
          method: "POST",
          headers,
          body: formData
        });
        data = yield streamRes.json();
      } catch (err) {
        console.log(
          "error in world4uGetStream",
          err instanceof Error ? err.message : err
        );
      }
      let $ = cheerio.load(html);
      const mediafireUrl = $('h1:contains("Download")').find("a").attr("href") || $(".input.popsok").attr("href") || url;
      console.log("mediafireUrl", mediafireUrl);
      if (mediafireUrl) {
        const directUrl = yield fetch(mediafireUrl, {
          headers: {
            Referer: url
          }
        });
        const urlContentType = directUrl.headers.get("content-type");
        console.log("mfcontentType", urlContentType);
        if (urlContentType && urlContentType.includes("video")) {
          streamLinks.push({
            server: "Mediafire",
            link: mediafireUrl,
            type: "mkv"
          });
          return streamLinks;
        } else {
          const repairRes = yield fetch(mediafireUrl, {
            headers: {
              Referer: url
            }
          });
          const repairHtml = yield repairRes.text();
          const base64Link = cheerio.load(repairHtml)(".input.popsok").attr("data-scrambled-url");
          console.log("base64Link", base64Link);
          const href = base64Link ? atob(base64Link) : null;
          console.log("href", href);
          let downloadLInk = (href == null ? void 0 : href.startsWith("https://")) ? href : null;
          console.log("downloadLInk", downloadLInk);
          if (downloadLInk) {
            streamLinks.push({
              server: "Mediafire",
              link: downloadLInk,
              type: "mkv"
            });
          }
          return streamLinks;
        }
      }
      const requireRepairRes = yield fetch(data.download);
      const contentType = requireRepairRes.headers.get("content-type");
      console.log("contentType", contentType);
      if (contentType && contentType.includes("video")) {
        streamLinks.push({
          server: "Mediafire",
          link: data.download,
          type: "mkv"
        });
        return streamLinks;
      } else {
        const repairRes = yield fetch(data.download, {
          headers: {
            Referer: url
          }
        });
        const repairHtml = yield repairRes.text();
        const $2 = cheerio.load(repairHtml);
        const repairLink = $2("#continue-btn").attr("href");
        console.log("repairLink", "https://www.mediafire.com" + repairLink);
        const repairRequireRepairRes = yield fetch(
          "https://www.mediafire.com" + repairLink
        );
        const $$ = cheerio.load(yield repairRequireRepairRes.text());
        const repairDownloadLink = $$(".input.popsok").attr("href");
        console.log("repairDownloadLink", repairDownloadLink);
        if (repairDownloadLink) {
          streamLinks.push({
            server: "Mediafire",
            link: repairDownloadLink,
            type: "mkv"
          });
        }
      }
      return streamLinks;
    } catch (err) {
      console.log(err instanceof Error ? err.message : err);
      return [];
    }
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

