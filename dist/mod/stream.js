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

// providers/mod/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  Cookie: "popads_user_id=6ba8fe60a481387a3249f05aa058822d",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
};
var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link: url,
    type,
    providerContext
  }) {
    var _a, _b;
    const { axios, cheerio } = providerContext;
    try {
      const modGetEpisodeLinks = /* @__PURE__ */ __name(function(_02) {
        return __async(this, arguments, function* ({
          url: url2,
          providerContext: providerContext2
        }) {
          var _a2;
          const { axios: axios2, cheerio: cheerio2 } = providerContext2;
          try {
            if (url2.includes("url=")) {
              url2 = atob(url2.split("url=")[1]);
            }
            const res = yield axios2.get(url2);
            const html = res.data;
            let $ = cheerio2.load(html);
            if (url2.includes("url=")) {
              const newUrl = (_a2 = $("meta[http-equiv='refresh']").attr("content")) == null ? void 0 : _a2.split("url=")[1];
              const res2 = yield axios2.get(newUrl || url2);
              const html2 = res2.data;
              $ = cheerio2.load(html2);
            }
            const episodeLinks = [];
            $("h3,h4").map((i, element) => {
              const seriesTitle = $(element).text();
              const episodesLink = $(element).find("a").attr("href");
              if (episodesLink && episodesLink !== "#") {
                episodeLinks.push({
                  title: seriesTitle.trim() || "No title found",
                  link: episodesLink || ""
                });
              }
            });
            $("a.maxbutton").map((i, element) => {
              const seriesTitle = $(element).children("span").text();
              const episodesLink = $(element).attr("href");
              if (episodesLink && episodesLink !== "#") {
                episodeLinks.push({
                  title: seriesTitle.trim() || "No title found",
                  link: episodesLink || ""
                });
              }
            });
            return episodeLinks;
          } catch (err) {
            console.error(err);
            return [];
          }
        });
      }, "modGetEpisodeLinks");
      console.log("modGetStream", type, url);
      if (type === "movie") {
        const servers2 = yield modGetEpisodeLinks({ url, providerContext });
        url = servers2[0].link || url;
      }
      let downloadLink = yield modExtractor(url, providerContext);
      const ddl = ((_b = (_a = downloadLink == null ? void 0 : downloadLink.data) == null ? void 0 : _a.match(/content="0;url=(.*?)"/)) == null ? void 0 : _b[1]) || url;
      const servers = [];
      const driveLink = yield isDriveLink(ddl);
      const driveRes = yield axios.get(driveLink, { headers });
      const driveHtml = driveRes.data;
      const $drive = cheerio.load(driveHtml);
      try {
        const resumeBot = $drive(".btn.btn-light").attr("href") || "";
        const resumeBotRes = yield axios.get(resumeBot, { headers });
        const resumeBotToken = resumeBotRes.data.match(
          /formData\.append\('token', '([a-f0-9]+)'\)/
        )[1];
        const resumeBotBody = new FormData();
        resumeBotBody.append("token", resumeBotToken);
        const resumeBotPath = resumeBotRes.data.match(
          /fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/
        )[1];
        const resumeBotBaseUrl = resumeBot.split("/download")[0];
        const resumeBotDownload = yield fetch(
          resumeBotBaseUrl + "/download?id=" + resumeBotPath,
          {
            method: "POST",
            body: resumeBotBody,
            headers: {
              Referer: resumeBot,
              Cookie: "PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308"
            }
          }
        );
        const resumeBotDownloadData = yield resumeBotDownload.json();
        console.log("resumeBotDownloadData", resumeBotDownloadData.url);
        servers.push({
          server: "ResumeBot",
          link: resumeBotDownloadData.url,
          type: "mkv"
        });
      } catch (err) {
        console.log("ResumeBot link not found", err);
      }
      try {
        const baseWorkerStream = $drive(".btn-success");
        baseWorkerStream.each((i, el) => {
          var _a2;
          const link = (_a2 = el.attribs) == null ? void 0 : _a2.href;
          if (link) {
            servers.push({
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
            servers.push({
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
            servers.push({
              server: "Cf Worker 2." + i,
              link,
              type: "mkv"
            });
          }
        });
      } catch (err) {
        console.log("CF workers link not found", err);
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
        servers.push({
          server: "Gdrive-Instant-2",
          link: (newLink == null ? void 0 : newLink.split("?url=")[1]) || newLink,
          type: "mkv"
        });
      } catch (err) {
        console.log("Instant link not found", err);
      }
      return servers;
    } catch (err) {
      console.log("getStream error", err);
      return [];
    }
  });
}, "getStream");
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
function modExtractor(url, providerContext) {
  return __async(this, null, function* () {
    const { axios, cheerio } = providerContext;
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
      console.log("wpHttp2", wpHttp2);
      var bodyFormData = new FormData();
      bodyFormData.append("_wp_http2", wpHttp2);
      const formUrl1 = $("form").attr("action");
      const formUrl = formUrl1 || url.split("?")[0];
      const res2 = yield fetch(formUrl, {
        method: "POST",
        body: bodyFormData
      });
      const html2 = yield res2.text();
      const link = html2.match(/setAttribute\("href",\s*"(.*?)"/)[1];
      console.log(link);
      const cookie = link.split("=")[1];
      console.log("cookie", cookie);
      const downloadLink = yield axios.get(link, {
        headers: {
          Referer: formUrl,
          Cookie: `${cookie}=${wpHttp2}`
        }
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

