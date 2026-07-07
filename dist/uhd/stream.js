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

// providers/uhd/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var getStream = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  link: url,
  providerContext
}) {
  var _a, _b;
  try {
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    let downloadLink = yield modExtractor(url, providerContext);
    const ddl = ((_b = (_a = downloadLink == null ? void 0 : downloadLink.data) == null ? void 0 : _a.match(/content="0;url=(.*?)"/)) == null ? void 0 : _b[1]) || url;
    console.log("ddl", ddl);
    const driveLink = yield isDriveLink(ddl);
    const ServerLinks = [];
    const driveRes = yield axios.get(driveLink, { headers });
    const driveHtml = driveRes.data;
    const $drive = cheerio.load(driveHtml);
    try {
      const seed = $drive(".btn-danger").attr("href") || "";
      const instantToken = seed.split("=")[1];
      const InstantFromData = new FormData();
      InstantFromData.append("keys", instantToken);
      const videoSeedUrl = seed.split("/").slice(0, 3).join("/") + "/api";
      const instantLinkRes = yield fetch(videoSeedUrl, {
        method: "POST",
        body: InstantFromData,
        headers: {
          "x-token": videoSeedUrl
        }
      });
      const instantLinkData = yield instantLinkRes.json();
      if (instantLinkData.error === false) {
        const instantLink = instantLinkData.url;
        ServerLinks.push({
          server: "Gdrive-Instant",
          link: instantLink,
          type: "mkv"
        });
      } else {
        console.log("Instant link not found", instantLinkData);
      }
    } catch (err) {
      console.log("Instant link not found", err);
    }
    try {
      const seed = $drive(".btn-danger").attr("href") || "";
      const newLinkRes = yield fetch(seed, {
        method: "HEAD",
        headers,
        redirect: "manual"
      });
      let newLink = seed;
      if (newLinkRes.status >= 300 && newLinkRes.status < 400) {
        newLink = newLinkRes.headers.get("location") || seed;
      } else if (newLinkRes.url && newLinkRes.url !== seed) {
        newLink = newLinkRes.url || newLinkRes.url;
      } else {
        newLink = newLinkRes.headers.get("location") || seed;
      }
      console.log("Gdrive-Instant-2 link", newLink == null ? void 0 : newLink.split("?url=")[1]);
      ServerLinks.push({
        server: "Gdrive-Instant-2",
        link: (newLink == null ? void 0 : newLink.split("?url=")[1]) || newLink,
        type: "mkv"
      });
    } catch (err) {
      console.log("Instant link not found", err);
    }
    try {
      const resumeDrive = driveLink.replace("/file", "/zfile");
      const resumeDriveRes = yield axios.get(resumeDrive, { headers });
      const resumeDriveHtml = resumeDriveRes.data;
      const $resumeDrive = cheerio.load(resumeDriveHtml);
      const resumeLink = $resumeDrive(".btn-success").attr("href");
      if (resumeLink) {
        ServerLinks.push({
          server: "ResumeCloud",
          link: resumeLink,
          type: "mkv"
        });
      }
    } catch (err) {
      console.log("Resume link not found");
    }
    try {
      const baseWorkerStream = $drive(".btn-success");
      baseWorkerStream.each((i, el) => {
        var _a2;
        const link = (_a2 = el.attribs) == null ? void 0 : _a2.href;
        if (link) {
          ServerLinks.push({
            server: "Resume Worker " + (i + 1),
            link,
            type: "mkv"
          });
        }
      });
    } catch (err) {
      console.log("Base page worker link not found", err);
    }
    try {
      const cfWorkersLink = driveLink.replace("/file", "/wfile") + "?type=1";
      const cfWorkersRes = yield axios.get(cfWorkersLink, { headers });
      const cfWorkersHtml = cfWorkersRes.data;
      const $cfWorkers = cheerio.load(cfWorkersHtml);
      const cfWorkersStream = $cfWorkers(".btn-success");
      cfWorkersStream.each((i, el) => {
        var _a2;
        const link = (_a2 = el.attribs) == null ? void 0 : _a2.href;
        if (link) {
          ServerLinks.push({
            server: "Cf Worker 1." + i,
            link,
            type: "mkv"
          });
        }
      });
    } catch (err) {
      console.log("CF workers link not found", err);
    }
    try {
      const cfWorkersLink = driveLink.replace("/file", "/wfile") + "?type=2";
      const cfWorkersRes = yield axios.get(cfWorkersLink, { headers });
      const cfWorkersHtml = cfWorkersRes.data;
      const $cfWorkers = cheerio.load(cfWorkersHtml);
      const cfWorkersStream = $cfWorkers(".btn-success");
      cfWorkersStream.each((i, el) => {
        var _a2;
        const link = (_a2 = el.attribs) == null ? void 0 : _a2.href;
        if (link) {
          ServerLinks.push({
            server: "Cf Worker 2." + i,
            link,
            type: "mkv"
          });
        }
      });
    } catch (err) {
      console.log("CF workers link not found", err);
    }
    console.log("ServerLinks", ServerLinks);
    return ServerLinks;
  } catch (err) {
    console.log("getStream error", err);
    return [];
  }
}), "getStream");
var isDriveLink = /* @__PURE__ */ __name((ddl) => __async(null, null, function* () {
  if (ddl.includes("drive")) {
    const driveLeach = yield fetch(ddl);
    const driveLeachData = yield driveLeach.text();
    const pathMatch = driveLeachData.match(
      /window\.location\.replace\("([^"]+)"\)/
    );
    const path = pathMatch == null ? void 0 : pathMatch[1];
    const mainUrl = ddl.split("/")[2];
    console.log(`driveUrl = https://${mainUrl}${path}`);
    return `https://${mainUrl}${path}`;
  } else {
    return ddl;
  }
}), "isDriveLink");
function getWithWAF(url, axios, openWebView, headers) {
  return __async(this, null, function* () {
    var _a;
    const baseUrl = url.split("/").slice(0, 3).join("/");
    try {
      return yield axios.get(url, { headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }) });
    } catch (error) {
      if (((_a = error.response) == null ? void 0 : _a.status) === 403 && openWebView) {
        console.log(`WAF detected (403) for ${url}, using solver...`);
        const wafResult = yield openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass anti-bot protection.",
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl }),
          waitForCookie: "cf_clearance",
          force: true
        });
        return yield axios.get(url, {
          headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl, Cookie: wafResult.cookie })
        });
      }
      throw error;
    }
  });
}
__name(getWithWAF, "getWithWAF");
function modExtractor(url, providerContext) {
  return __async(this, null, function* () {
    const { axios, cheerio, openWebView } = providerContext;
    try {
      const wpHttp = url.split("sid=")[1];
      var bodyFormData0 = new FormData();
      bodyFormData0.append("_wp_http", wpHttp);
      const res = yield fetch(url.split("?")[0], {
        method: "POST",
        body: bodyFormData0
      });
      const data = yield res.text();
      const html = data;
      const $ = cheerio.load(html);
      const wpHttp2 = $("input").attr("name", "_wp_http2").val();
      var bodyFormData = new FormData();
      bodyFormData.append("_wp_http2", wpHttp2);
      const formUrl1 = $("form").attr("action");
      const formUrl = formUrl1 || url.split("?")[0];
      const res2 = yield fetch(formUrl, {
        method: "POST",
        body: bodyFormData
      });
      const html2 = yield res2.text();
      const linkMatch = html2.match(/setAttribute\("href",\s*"(.*?)"/);
      if (!linkMatch) return null;
      const link = linkMatch[1];
      console.log(link);
      const cookie = link.split("=")[1];
      console.log("cookie", cookie);
      const downloadLink = yield getWithWAF(link, axios, openWebView, {
        Referer: formUrl,
        Cookie: `${cookie}=${wpHttp2}`
      });
      return downloadLink;
    } catch (err) {
      console.log("modGetStream error", err);
    }
  });
}
__name(modExtractor, "modExtractor");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

