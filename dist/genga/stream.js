"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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

// providers/genga/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});

var crypto = __toESM(require("crypto"));
var vm = __toESM(require("vm"));
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
function decryptAes(hexText) {
  const key = Buffer.from("kiemtienmua911ca", "utf8");
  const iv = Buffer.from("1234567890oiuytr", "utf8");
  const encryptedBytes = Buffer.from(hexText, "hex");
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(encryptedBytes);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}
__name(decryptAes, "decryptAes");
function decodeBase64Embed(embedId) {
  if (!embedId || !embedId.includes(":")) return null;
  try {
    const parts = embedId.split(":");
    let nameB64 = parts[0];
    let urlB64 = parts[1];
    nameB64 += "=".repeat((4 - nameB64.length % 4) % 4);
    urlB64 += "=".repeat((4 - urlB64.length % 4) % 4);
    const name = Buffer.from(nameB64, "base64").toString("utf8").trim();
    const url = Buffer.from(urlB64, "base64").toString("utf8").trim();
    return { name, url };
  } catch (e) {
    return null;
  }
}
__name(decodeBase64Embed, "decodeBase64Embed");
var getStream = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    const streamLinks = [];
    try {
      const { axios, cheerio } = providerContext;
      const parts = link.split("*");
      const watchUrl = parts[0];
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.desidubanime.me/"
      };
      const res = yield axios.get(watchUrl, { headers });
      const html = res.data || "";
      const $ = cheerio.load(html);
      const servers = [];
      $("[data-embed-id]").each((_, el) => {
        const embedId = $(el).attr("data-embed-id") || "";
        const decoded = decodeBase64Embed(embedId);
        if (decoded) {
          servers.push(decoded);
        }
      });
      let gdMirrorSid = null;
      let cloudExternalUrl = null;
      for (const s of servers) {
        if (s.name.toLowerCase() === "cloud") {
          cloudExternalUrl = s.url;
        }
        if (s.url.includes("gdmirrorbot.nl")) {
          const sidMatch = s.url.match(/\/embed\/([^/]+)/);
          if (sidMatch) {
            gdMirrorSid = sidMatch[1];
          }
        }
      }
      if (cloudExternalUrl) {
        try {
          const cloudHeaders = {
            "User-Agent": USER_AGENT,
            "Referer": "https://cloud.desidubanime.me/"
          };
          const extRes = yield axios.get(cloudExternalUrl, { headers: cloudHeaders });
          const extHtml = extRes.data || "";
          const sourcesMatch = extHtml.match(/const\s+sources\s*=\s*(\[[\s\S]*?\]);/);
          if (sourcesMatch) {
            const sources = JSON.parse(sourcesMatch[1]);
            const firstSource = sources[0];
            if (firstSource && firstSource.url) {
              const playUrl = `https://cloud.desidubanime.me${firstSource.url}`;
              const playRes = yield axios.get(playUrl, { headers: cloudHeaders });
              const playHtml = playRes.data || "";
              const $play = cheerio.load(playHtml);
              const playerScript = $play("script").eq(1).text();
              if (playerScript) {
                const setupConfigs = [];
                const dummyElement = {
                  appendChild: /* @__PURE__ */ __name(() => {
                  }, "appendChild"),
                  removeChild: /* @__PURE__ */ __name(() => {
                  }, "removeChild"),
                  setAttribute: /* @__PURE__ */ __name(() => {
                  }, "setAttribute"),
                  style: {}
                };
                const mockPlayer = {
                  setup: /* @__PURE__ */ __name(function(config) {
                    setupConfigs.push(config);
                    return this;
                  }, "setup"),
                  on: /* @__PURE__ */ __name(function() {
                    return this;
                  }, "on"),
                  addButton: /* @__PURE__ */ __name(function() {
                    return this;
                  }, "addButton"),
                  onReady: /* @__PURE__ */ __name(function(cb) {
                    if (cb) cb();
                    return this;
                  }, "onReady"),
                  onTime: /* @__PURE__ */ __name(function() {
                    return this;
                  }, "onTime"),
                  onComplete: /* @__PURE__ */ __name(function() {
                    return this;
                  }, "onComplete"),
                  onPlay: /* @__PURE__ */ __name(function() {
                    return this;
                  }, "onPlay"),
                  onPause: /* @__PURE__ */ __name(function() {
                    return this;
                  }, "onPause"),
                  getPlaylist: /* @__PURE__ */ __name(function() {
                    return [];
                  }, "getPlaylist")
                };
                const context = {
                  window: {},
                  document: {
                    getElementById: /* @__PURE__ */ __name(() => dummyElement, "getElementById"),
                    querySelector: /* @__PURE__ */ __name(() => dummyElement, "querySelector"),
                    createElement: /* @__PURE__ */ __name(() => dummyElement, "createElement"),
                    body: dummyElement,
                    head: dummyElement,
                    addEventListener: /* @__PURE__ */ __name(() => {
                    }, "addEventListener")
                  },
                  navigator: {
                    userAgent: USER_AGENT
                  },
                  jwplayer: /* @__PURE__ */ __name(() => mockPlayer, "jwplayer"),
                  playerInstance: mockPlayer,
                  console: {
                    log: /* @__PURE__ */ __name(() => {
                    }, "log"),
                    error: /* @__PURE__ */ __name(() => {
                    }, "error"),
                    warn: /* @__PURE__ */ __name(() => {
                    }, "warn")
                  },
                  setTimeout: /* @__PURE__ */ __name(() => {
                  }, "setTimeout"),
                  setInterval: /* @__PURE__ */ __name(() => {
                  }, "setInterval"),
                  location: {
                    href: playUrl,
                    hostname: "cloud.desidubanime.me",
                    protocol: "https:"
                  }
                };
                context.window = context;
                vm.createContext(context);
                vm.runInContext(playerScript, context);
                if (setupConfigs.length > 0 && setupConfigs[0].file) {
                  const hlsFile = setupConfigs[0].file;
                  streamLinks.push({
                    server: "CLOUD",
                    link: `https://cloud.desidubanime.me${hlsFile}`,
                    type: "hls",
                    headers: {
                      "User-Agent": USER_AGENT,
                      "Referer": "https://cloud.desidubanime.me/"
                    }
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("DesiDubAnime CLOUD resolver error:", err);
        }
      }
      if (gdMirrorSid) {
        try {
          const payload = new URLSearchParams();
          payload.append("sid", gdMirrorSid);
          payload.append("UserFavSite", "");
          payload.append("currentDomain", "https://www.desidubanime.me/");
          const helperHeaders = {
            "User-Agent": USER_AGENT,
            "Referer": "https://pro.iqsmartgames.com/",
            "Content-Type": "application/x-www-form-urlencoded"
          };
          const helperRes = yield axios.post("https://pro.iqsmartgames.com/embedhelper.php", payload.toString(), {
            headers: helperHeaders
          });
          const helperData = helperRes.data || {};
          if (helperData.mresult && helperData.siteUrls) {
            let mresultB64 = helperData.mresult;
            mresultB64 += "=".repeat((4 - mresultB64.length % 4) % 4);
            const decodedMresult = JSON.parse(Buffer.from(mresultB64, "base64").toString("utf8"));
            const siteUrls = helperData.siteUrls;
            const friendlyNames = helperData.siteFriendlyNames || {};
            for (const [key, code] of Object.entries(decodedMresult)) {
              const baseUrl = siteUrls[key];
              const serverName = friendlyNames[key] || key;
              if (baseUrl && (key === "rpmshre" || key === "upnshr" || key === "strmp2")) {
                try {
                  const domainMatch = baseUrl.match(/https?:\/\/([^/]+)/);
                  if (domainMatch) {
                    const domainHost = domainMatch[1];
                    const videoApiUrl = `https://${domainHost}/api/v1/video?id=${code}&w=1920&h=1080&r=https://www.desidubanime.me/`;
                    const playerHeaders = {
                      "User-Agent": USER_AGENT,
                      "Referer": baseUrl
                    };
                    const videoRes = yield axios.get(videoApiUrl, { headers: playerHeaders });
                    const hexText = videoRes.data || "";
                    if (hexText) {
                      const decrypted = JSON.parse(decryptAes(hexText));
                      const sourceUrl = decrypted.source || decrypted.cf || "";
                      if (sourceUrl) {
                        streamLinks.push({
                          server: serverName,
                          link: sourceUrl,
                          type: "hls",
                          headers: {
                            "User-Agent": USER_AGENT,
                            "Referer": baseUrl
                          }
                        });
                      }
                    }
                  }
                } catch (innerErr) {
                  console.error(`DesiDubAnime error resolving key ${key}:`, innerErr);
                }
              }
            }
          }
        } catch (err) {
          console.error("DesiDubAnime IQSmartGames helper error:", err);
        }
      }
    } catch (err) {
      console.error("DesiDubAnime getStream error:", err);
    }
    return streamLinks;
  });
}, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

