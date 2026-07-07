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

// providers/autoEmbed/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getRiveStream: () => getRiveStream,
  getStream: () => getStream,
  getWebstreamerStream: () => getWebstreamerStream
});

var getStream = /* @__PURE__ */ __name((_0) => __async(null, [_0], function* ({
  link: id,
  type,
  providerContext
}) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  try {
    const streams = [];
    const payload = (() => {
      try {
        return JSON.parse(id);
      } catch (e) {
        return { tmdbId: id };
      }
    })();
    const tmdbId = (_c = (_b = (_a = payload.tmdbId) != null ? _a : payload.id) != null ? _b : payload.tmdId) != null ? _c : "";
    const imdbId = (_d = payload.imdbId) != null ? _d : "";
    const season = (_e = payload.season) != null ? _e : "";
    const episode = (_f = payload.episode) != null ? _f : "";
    const effectiveType = (_h = (_g = payload.type) != null ? _g : type) != null ? _h : "movie";
    yield getWebstreamerStream(
      String(imdbId),
      episode,
      season,
      effectiveType,
      streams,
      providerContext
    );
    yield getRiveStream(
      String(tmdbId),
      episode,
      season,
      effectiveType,
      streams,
      providerContext
    );
    return streams;
  } catch (err) {
    console.error(err);
    return [];
  }
}), "getStream");
function getWebstreamerStream(imdbId, episode, season, type, Streams, providerContext) {
  return __async(this, null, function* () {
    var _a;
    if (!imdbId || imdbId === "undefined") return;
    const url = `https://webstreamr.hayd.uk/{"multi":"on","al":"on","de":"on","es":"on","fr":"on","hi":"on","it":"on","mx":"on","mediaFlowProxyUrl":"","mediaFlowProxyPassword":""}/stream/${type}/${imdbId}${type === "series" ? `:${season}:${episode}` : ""}.json`;
    console.log("Webstreamer URL: ", encodeURI(url));
    try {
      const res = yield providerContext.axios.get(encodeURI(url), {
        timeout: 3e4,
        headers: providerContext.commonHeaders
      });
      (_a = res.data) == null ? void 0 : _a.streams.forEach((source) => {
        const url2 = source == null ? void 0 : source.url;
        const name = (source == null ? void 0 : source.name) || "WebStreamer";
        const qualityMatch = name == null ? void 0 : name.match(/(\d{3,4})p/);
        const quality = qualityMatch ? qualityMatch[1] : void 0;
        Streams.push({
          server: name,
          link: url2,
          type,
          quality
        });
      });
    } catch (e) {
      throw e;
    }
  });
}
__name(getWebstreamerStream, "getWebstreamerStream");
function getRiveStream(tmdId, episode, season, type, Streams, providerContext) {
  return __async(this, null, function* () {
    if (!tmdId || tmdId === "undefined") {
      console.warn("autoEmbed/rive: missing tmdbId in link payload");
      return;
    }
    const secret = generateSecretKey(tmdId);
    const servers = [
      "flowcast",
      "asiacloud",
      "humpy",
      "primevids",
      "shadow",
      "hindicast",
      "animez",
      "aqua",
      "yggdrasil",
      "putafilme",
      "ophim"
    ];
    const baseUrl = yield providerContext.getBaseUrl("rive");
    const cors = process.env.CORS_PRXY ? process.env.CORS_PRXY + "?url=" : "";
    console.log("CORS: " + cors);
    const route = type === "series" ? `/api/backendfetch?requestID=tvVideoProvider&id=${tmdId}&season=${season}&episode=${episode}&secretKey=${secret}&service=` : `/api/backendfetch?requestID=movieVideoProvider&id=${tmdId}&secretKey=${secret}&service=`;
    const url = cors ? cors + encodeURIComponent(baseUrl + route) : baseUrl + route;
    yield Promise.all(
      servers.map((server) => __async(null, null, function* () {
        var _a, _b;
        console.log("Rive: " + url + server);
        try {
          const res = yield providerContext.axios.get(url + server, {
            timeout: 8e3
          });
          const subtitles = [];
          (_b = (_a = res.data) == null ? void 0 : _a.data) == null ? void 0 : _b.sources.forEach((source) => {
            Streams.push({
              server: (source == null ? void 0 : source.source) + "-" + (source == null ? void 0 : source.quality),
              link: source == null ? void 0 : source.url,
              type: (source == null ? void 0 : source.format) === "hls" ? "m3u8" : "mp4",
              quality: source == null ? void 0 : source.quality,
              // subtitles: subtitles,
              headers: {
                referer: baseUrl
              }
            });
          });
        } catch (e) {
          console.log(e);
        }
      }))
    );
  });
}
__name(getRiveStream, "getRiveStream");
function generateSecretKey(id) {
  const c = [
    "4Z7lUo",
    "gwIVSMD",
    "PLmz2elE2v",
    "Z4OFV0",
    "SZ6RZq6Zc",
    "zhJEFYxrz8",
    "FOm7b0",
    "axHS3q4KDq",
    "o9zuXQ",
    "4Aebt",
    "wgjjWwKKx",
    "rY4VIxqSN",
    "kfjbnSo",
    "2DyrFA1M",
    "YUixDM9B",
    "JQvgEj0",
    "mcuFx6JIek",
    "eoTKe26gL",
    "qaI9EVO1rB",
    "0xl33btZL",
    "1fszuAU",
    "a7jnHzst6P",
    "wQuJkX",
    "cBNhTJlEOf",
    "KNcFWhDvgT",
    "XipDGjST",
    "PCZJlbHoyt",
    "2AYnMZkqd",
    "HIpJh",
    "KH0C3iztrG",
    "W81hjts92",
    "rJhAT",
    "NON7LKoMQ",
    "NMdY3nsKzI",
    "t4En5v",
    "Qq5cOQ9H",
    "Y9nwrp",
    "VX5FYVfsf",
    "cE5SJG",
    "x1vj1",
    "HegbLe",
    "zJ3nmt4OA",
    "gt7rxW57dq",
    "clIE9b",
    "jyJ9g",
    "B5jXjMCSx",
    "cOzZBZTV",
    "FTXGy",
    "Dfh1q1",
    "ny9jqZ2POI",
    "X2NnMn",
    "MBtoyD",
    "qz4Ilys7wB",
    "68lbOMye",
    "3YUJnmxp",
    "1fv5Imona",
    "PlfvvXD7mA",
    "ZarKfHCaPR",
    "owORnX",
    "dQP1YU",
    "dVdkx",
    "qgiK0E",
    "cx9wQ",
    "5F9bGa",
    "7UjkKrp",
    "Yvhrj",
    "wYXez5Dg3",
    "pG4GMU",
    "MwMAu",
    "rFRD5wlM"
  ];
  if (id === void 0) {
    return "rive";
  }
  try {
    let t, n;
    const r = String(id);
    if (isNaN(Number(id))) {
      const sum = r.split("").reduce((e, ch) => e + ch.charCodeAt(0), 0);
      t = c[sum % c.length] || btoa(r);
      n = Math.floor(sum % r.length / 2);
    } else {
      const num = Number(id);
      t = c[num % c.length] || btoa(r);
      n = Math.floor(num % r.length / 2);
    }
    const i = r.slice(0, n) + t + r.slice(n);
    const innerHash = /* @__PURE__ */ __name((e) => {
      e = String(e);
      let t2 = 0 >>> 0;
      for (let n2 = 0; n2 < e.length; n2++) {
        const r2 = e.charCodeAt(n2);
        const i2 = ((t2 = r2 + (t2 << 6) + (t2 << 16) - t2 >>> 0) << n2 % 5 | t2 >>> 32 - n2 % 5) >>> 0;
        t2 = (t2 ^ (i2 ^ (r2 << n2 % 7 | r2 >>> 8 - n2 % 7) >>> 0)) >>> 0;
        t2 = t2 + (t2 >>> 11 ^ t2 << 3) >>> 0;
      }
      t2 ^= t2 >>> 15;
      t2 = (t2 & 65535) * 49842 + (((t2 >>> 16) * 49842 & 65535) << 16) >>> 0;
      t2 ^= t2 >>> 13;
      t2 = (t2 & 65535) * 40503 + (((t2 >>> 16) * 40503 & 65535) << 16) >>> 0;
      t2 ^= t2 >>> 16;
      return t2.toString(16).padStart(8, "0");
    }, "innerHash");
    const outerHash = /* @__PURE__ */ __name((e) => {
      const t2 = String(e);
      let n2 = (3735928559 ^ t2.length) >>> 0;
      for (let idx = 0; idx < t2.length; idx++) {
        let r2 = t2.charCodeAt(idx);
        r2 ^= (131 * idx + 89 ^ r2 << idx % 5) & 255;
        n2 = (n2 << 7 | n2 >>> 25) >>> 0 ^ r2;
        const i2 = (n2 & 65535) * 60205 >>> 0;
        const o2 = (n2 >>> 16) * 60205 << 16 >>> 0;
        n2 = i2 + o2 >>> 0;
        n2 ^= n2 >>> 11;
      }
      n2 ^= n2 >>> 15;
      n2 = (n2 & 65535) * 49842 + ((n2 >>> 16) * 49842 << 16) >>> 0 >>> 0;
      n2 ^= n2 >>> 13;
      n2 = (n2 & 65535) * 40503 + ((n2 >>> 16) * 40503 << 16) >>> 0 >>> 0;
      n2 ^= n2 >>> 16;
      n2 = (n2 & 65535) * 10196 + ((n2 >>> 16) * 10196 << 16) >>> 0 >>> 0;
      n2 ^= n2 >>> 15;
      return n2.toString(16).padStart(8, "0");
    }, "outerHash");
    const o = outerHash(innerHash(i));
    return btoa(o);
  } catch (e) {
    return "topSecret";
  }
}
__name(generateSecretKey, "generateSecretKey");
exports.getRiveStream = getRiveStream;
exports.getStream = getStream;
exports.getWebstreamerStream = getWebstreamerStream;
// Annotate the CommonJS export names for ESM import in node:

