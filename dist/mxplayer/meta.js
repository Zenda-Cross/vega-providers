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

// providers/mxplayer/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
var cachedUserId = null;
var getUserId = /* @__PURE__ */ __name(() => {
  if (!cachedUserId) {
    cachedUserId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  return cachedUserId;
}, "getUserId");
var parseImage = /* @__PURE__ */ __name((imageInfo) => {
  if (!imageInfo || imageInfo.length === 0) return "";
  const portrait = imageInfo.find((img) => img.type === "portrait_large" || img.type === "portrait");
  const fallback = imageInfo.find((img) => img.type === "landscape" || img.type === "bigpic");
  const path = portrait ? portrait.url : fallback ? fallback.url : imageInfo[0].url;
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://qqcdnpictest.mxplay.com/${path}`;
}, "parseImage");
function parseState(str) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(str.substring(0, i + 1));
        }
      }
    }
  }
  throw new Error("No matching closing brace found.");
}
__name(parseState, "parseState");
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    try {
      const { axios } = providerContext;
      const parts = link.split("*");
      const id = parts[0];
      const type = parts[1] || "episode";
      const webUrl = parts[2] || "";
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": "https://www.mxplayer.in/",
        "Origin": "https://www.mxplayer.in"
      };
      if (type === "tvshow" || type === "tv_show") {
        const showUrl = `https://www.mxplayer.in${webUrl}`;
        const showRes = yield axios.get(showUrl, { headers });
        const html = showRes.data || "";
        const match = html.match(new RegExp("window\\.__mxs__\\s*=\\s*({.*)", "s")) || html.match(new RegExp("__mxs__\\s*=\\s*({.*)", "s"));
        const seasons = [];
        let showTitle = "TV Show";
        let showSynopsis = "";
        let showImage = "";
        if (match) {
          try {
            const data = parseState(match[1]);
            const entities = data.entities || {};
            Object.values(entities).forEach((ev) => {
              if (ev.type === "tvshow" || ev.type === "tv_show") {
                showTitle = ev.title || showTitle;
                showSynopsis = ev.description || showSynopsis;
                showImage = parseImage(ev.imageInfo) || showImage;
                const tabs = ev.tabs || [];
                tabs.forEach((tab) => {
                  if (tab.type === "tvshowepisodes") {
                    const containers = tab.containers || [];
                    containers.forEach((c) => {
                      if (c.type === "season") {
                        const seq = c.sequence || c.season_number || c.seasonNo || 1;
                        seasons.push({
                          id: c.id,
                          title: c.title || `Season ${seq}`,
                          sequence: Number(seq)
                        });
                      }
                    });
                  }
                });
              }
            });
          } catch (e) {
            console.error("MXPlayer parse seasons JSON error:", e);
          }
        }
        seasons.sort((a, b) => a.sequence - b.sequence);
        return {
          title: showTitle,
          synopsis: showSynopsis,
          image: showImage,
          imdbId: "",
          type: "series",
          linkList: seasons.map((s) => ({
            title: s.title,
            episodesLink: `${s.id}*season`
          }))
        };
      } else {
        const url = `https://api.mxplayer.in/v1/web/detail/video?id=${id}&type=${type}&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
        const res = yield axios.get(url, { headers });
        const data = res.data || {};
        const title = data.title || "";
        const synopsis = data.description || "";
        const image = parseImage(data.imageInfo);
        const rating = data.rating ? (data.rating / 2).toFixed(1) : "";
        return {
          title,
          synopsis,
          image,
          imdbId: "",
          type: type === "movie" ? "movie" : "series",
          rating,
          linkList: [
            {
              title: "Play",
              directLinks: [
                {
                  title,
                  link: `${id}*${type}`
                }
              ]
            }
          ]
        };
      }
    } catch (err) {
      console.error("MXPlayer getMeta error:", err);
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

