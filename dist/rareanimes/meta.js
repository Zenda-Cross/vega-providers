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

// providers/rareanimes/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});


// providers/getBaseUrl.ts
var urlsEndpoint = "https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/urls.json";
var cacheTtl = 60 * 60 * 1e3;
function getCache() {
  var _a;
  const state = typeof providerGlobal !== "undefined" && providerGlobal ? providerGlobal : globalThis;
  (_a = state.__vegaProviderBaseUrlCache__) != null ? _a : state.__vegaProviderBaseUrlCache__ = { expiresAt: 0 };
  return state.__vegaProviderBaseUrlCache__;
}
__name(getCache, "getCache");
function fetchProviderUrls() {
  return __async(this, null, function* () {
    const cache = getCache();
    if (cache.data && Date.now() < cache.expiresAt) {
      return cache.data;
    }
    if (cache.request) {
      return cache.request;
    }
    const request = fetch(urlsEndpoint).then((response) => __async(null, null, function* () {
      if (!response.ok) {
        throw new Error(`URL configuration request failed: ${response.status}`);
      }
      const data = yield response.json();
      console.log("Fetched provider URL configuration");
      cache.data = data;
      cache.expiresAt = Date.now() + cacheTtl;
      return data;
    })).catch((error) => {
      if (cache.data) {
        console.warn("Using stale provider URL configuration", error);
        return cache.data;
      }
      throw error;
    }).finally(() => {
      cache.request = void 0;
    });
    Object.defineProperty(cache, "request", {
      configurable: true,
      enumerable: false,
      value: request,
      writable: true
    });
    return request;
  });
}
__name(fetchProviderUrls, "fetchProviderUrls");
var getBaseUrl = /* @__PURE__ */ __name((providerValue) => __async(null, null, function* () {
  var _a, _b;
  try {
    const providerUrls = yield fetchProviderUrls();
    return (_b = (_a = providerUrls[providerValue]) == null ? void 0 : _a.url) != null ? _b : "";
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    throw error;
  }
}), "getBaseUrl");

// providers/providerErrors.ts
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}
__name(getErrorMessage, "getErrorMessage");
function throwProviderError(provider, operation, error) {
  var _a, _b;
  const response = error == null ? void 0 : error.response;
  const status = response == null ? void 0 : response.status;
  const statusText = response == null ? void 0 : response.statusText;
  const url = ((_a = response == null ? void 0 : response.config) == null ? void 0 : _a.url) || ((_b = error == null ? void 0 : error.config) == null ? void 0 : _b.url);
  const details = [
    status ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}` : "",
    url ? `URL ${url}` : "",
    getErrorMessage(error)
  ].filter(Boolean);
  throw new Error(`${provider} ${operation} failed: ${details.join(" | ")}`);
}
__name(throwProviderError, "throwProviderError");

// providers/getCinemetaMeta.ts
var CINEMETA_BASE_URL = "https://v3-cinemeta.strem.io/meta";
function isCinemetaPromise(value) {
  return typeof value.then === "function";
}
__name(isCinemetaPromise, "isCinemetaPromise");
function getCache2() {
  const state = typeof providerGlobal !== "undefined" && providerGlobal ? providerGlobal : globalThis;
  if (!state.__vegaCinemetaCache__ || typeof state.__vegaCinemetaCache__ !== "object") {
    state.__vegaCinemetaCache__ = /* @__PURE__ */ Object.create(null);
  }
  return state.__vegaCinemetaCache__;
}
__name(getCache2, "getCache");
function resolveTmdbToImdb(tmdbId, type, providerContext) {
  return __async(this, null, function* () {
    var _a;
    try {
      const tmdbType = type === "series" ? "tv" : "movie";
      const res = yield providerContext.axios.get(
        `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/external_ids?api_key=cfe422613b250f702980a3bbf9e90716`,
        { timeout: 5e3 }
      );
      const imdb = (_a = res.data) == null ? void 0 : _a.imdb_id;
      if (typeof imdb === "string" && /^tt\d+$/.test(imdb)) {
        return imdb;
      }
    } catch (e) {
    }
    return null;
  });
}
__name(resolveTmdbToImdb, "resolveTmdbToImdb");
function getCinemetaMeta(id, type, providerContext) {
  return __async(this, null, function* () {
    var _a;
    if (!id || typeof id !== "string") {
      return null;
    }
    let cleanImdbId = (_a = id.match(/tt\d+/)) == null ? void 0 : _a[0];
    if (!cleanImdbId) {
      const tmdbMatch = id.match(/(?:themoviedb\.org\/(?:movie|tv)\/|tmdb:?)(\d+)/i) || id.match(/^(\d+)$/);
      if (tmdbMatch) {
        cleanImdbId = (yield resolveTmdbToImdb(tmdbMatch[1], type, providerContext)) || void 0;
      }
    }
    if (!cleanImdbId) {
      return null;
    }
    const cache = getCache2();
    const cached = cache[cleanImdbId];
    if (cached) {
      if (isCinemetaPromise(cached)) {
        return cached;
      }
      if (cached.name && cached.imdb_id === cleanImdbId) {
        return cached;
      }
      delete cache[cleanImdbId];
    }
    const mediaType = type === "series" ? "series" : "movie";
    const url = `${CINEMETA_BASE_URL}/${mediaType}/${cleanImdbId}.json`;
    const request = providerContext.axios.get(url, { timeout: 8e3 }).then((response) => {
      var _a2;
      const meta = (_a2 = response.data) == null ? void 0 : _a2.meta;
      if (!(meta == null ? void 0 : meta.name) || meta.imdb_id !== cleanImdbId) {
        delete cache[cleanImdbId];
        return null;
      }
      cache[cleanImdbId] = meta;
      return meta;
    }).catch(() => {
      delete cache[cleanImdbId];
      return null;
    });
    cache[cleanImdbId] = request;
    return request;
  });
}
__name(getCinemetaMeta, "getCinemetaMeta");
function getEpisodeNumber(title, season) {
  if (/\b(?:e\d+|episodes?\s*:?\s*\d+)\s*(?:[-–,&/]|\band\b)\s*(?:e|episodes?\s*:?\s*)?\d+/i.test(
    title
  )) {
    return void 0;
  }
  const explicitSeasons = [
    ...title.matchAll(/\bseason\s*:?\s*(\d{1,2})\b/gi),
    ...title.matchAll(/\bs(\d{1,2})\s*e\d{1,3}\b/gi)
  ].map((match) => Number(match[1]));
  if (explicitSeasons.some((value) => value !== season)) return void 0;
  const matches = [
    ...title.matchAll(/\bs\d{1,2}\s*e(\d{1,3})\b/gi),
    ...title.matchAll(/\bepisodes?\s*:?\s*(\d{1,3})\b/gi),
    ...title.matchAll(/\bep\s*\.?:?\s*(\d{1,3})\b/gi),
    ...title.matchAll(/\be(\d{1,3})\b/gi),
    ...title.matchAll(/^\s*(\d{1,3})\s*[.:-]\s*/gi)
  ].map((match) => Number(match[1]));
  const episodes = [...new Set(matches.filter((episode) => episode > 0))];
  return episodes.length === 1 ? episodes[0] : void 0;
}
__name(getEpisodeNumber, "getEpisodeNumber");
function enrichCinemetaEpisodes(episodes, videos, season) {
  var _a;
  if (!videos || !Array.isArray(videos) || videos.length === 0 || !season) {
    return episodes;
  }
  const videosByEpisode = /* @__PURE__ */ new Map();
  let hasDuplicateVideo = false;
  for (const video of videos) {
    const episode = (_a = video.episode) != null ? _a : video.number;
    if (video.season !== season || !episode) continue;
    if (videosByEpisode.has(episode)) {
      hasDuplicateVideo = true;
      continue;
    }
    videosByEpisode.set(episode, video);
  }
  const matched = episodes.map((episode) => {
    const episodeNumber = getEpisodeNumber(episode.title, season);
    const video = episodeNumber ? videosByEpisode.get(episodeNumber) : void 0;
    const description = (video == null ? void 0 : video.description) || (video == null ? void 0 : video.overview);
    return { episode, episodeNumber, video, description };
  });
  const numbers = matched.map(({ episodeNumber }) => episodeNumber);
  const allMatched = episodes.length > 0 && !hasDuplicateVideo && matched.every(({ video }) => Boolean(video)) && new Set(numbers).size === numbers.length;
  if (!allMatched) return episodes;
  return matched.map(({ episode, video, description }) => __spreadProps(__spreadValues({}, episode), {
    description: description || episode.description,
    image: (video == null ? void 0 : video.thumbnail) || episode.image
  }));
}
__name(enrichCinemetaEpisodes, "enrichCinemetaEpisodes");

// providers/rareanimes/meta.ts
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
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};
var PREFERRED_LANG_ORDER = [
  "Hindi DUB",
  "Hindi",
  "Tamil",
  "Telugu",
  "English",
  "Japanese",
  "Korean",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Punjabi",
  "Urdu",
  "Multi-Audio",
  "Multi Audio",
  "MultiAudio"
];
var langOrderIndex = /* @__PURE__ */ __name((lang) => {
  const idx = PREFERRED_LANG_ORDER.findIndex(
    (l) => l.toLowerCase() === lang.toLowerCase()
  );
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}, "langOrderIndex");
var normalizeLang = /* @__PURE__ */ __name((raw) => {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (/^hindi\s*dub$/i.test(cleaned)) return "Hindi DUB";
  if (/^hindi$/i.test(cleaned)) return "Hindi";
  if (/^tamil$/i.test(cleaned)) return "Tamil";
  if (/^telugu$/i.test(cleaned)) return "Telugu";
  if (/^english$/i.test(cleaned)) return "English";
  if (/^japanese$/i.test(cleaned)) return "Japanese";
  if (/^korean$/i.test(cleaned)) return "Korean";
  return cleaned;
}, "normalizeLang");
var SERVER_DEFS = [
  { re: /^hubcloud$/i, name: "HubCloud", order: 1 },
  { re: /hubcloud/i, name: "HubCloud", order: 1 },
  { re: /^watch\s*multi\s*quality$/i, name: "Watch Multi Quality", order: 2 },
  { re: /watch\s*multi\s*quality/i, name: "Watch Multi Quality", order: 2 },
  { re: /^watchmulti(quality)?$/i, name: "Watch Multi Quality", order: 2 },
  { re: /watchmulti(quality)?/i, name: "Watch Multi Quality", order: 2 },
  { re: /^watch\s*now$/i, name: "Watch Now", order: 3 },
  { re: /watch\s*now/i, name: "Watch Now", order: 3 },
  { re: /^dl\s*beta$/i, name: "DL Beta", order: 4 },
  { re: /dl\s*beta/i, name: "DL Beta", order: 4 },
  { re: /^mega$/i, name: "Mega", order: 5 },
  { re: /mega/i, name: "Mega", order: 5 },
  { re: /^gdrive$|^google\s*drive$/i, name: "GDrive", order: 6 },
  { re: /gdrive|google\s*drive/i, name: "GDrive", order: 6 },
  { re: /^gdflix$/i, name: "GDFlix", order: 7 },
  { re: /gdflix/i, name: "GDFlix", order: 7 }
];
var matchServer = /* @__PURE__ */ __name((anchorText) => {
  const t = anchorText.trim();
  for (const def of SERVER_DEFS) if (def.re.test(t)) return def;
  return null;
}, "matchServer");
function pickBestServerLink($, p) {
  const candidates = [];
  p.find("a").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href");
    if (!href) return;
    if (!href.includes("codedew.com/zipper") && !href.includes("hubcloud")) {
      return;
    }
    const anchorText = $a.text().trim();
    const server = matchServer(anchorText);
    if (!server) return;
    candidates.push({ name: server.name, href, order: server.order });
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.order - b.order);
  return candidates[0];
}
__name(pickBestServerLink, "pickBestServerLink");
function applyCinemeta(info, meta) {
  var _a;
  if (!meta) return info;
  return __spreadProps(__spreadValues({}, info), {
    title: meta.name || info.title,
    image: meta.background || meta.poster || info.image,
    poster: meta.poster || info.poster,
    logo: meta.logo || void 0,
    synopsis: meta.description || info.synopsis,
    imdbId: meta.imdb_id || info.imdbId || "",
    tmdbId: ((_a = meta.moviedb_id) == null ? void 0 : _a.toString()) || info.tmdbId || void 0,
    type: meta.type || info.type,
    tags: meta.genres || meta.genre || void 0,
    cast: meta.cast || void 0,
    rating: meta.imdbRating || void 0
  });
}
__name(applyCinemeta, "applyCinemeta");
function extractImdbId($) {
  var _a, _b, _c, _d, _e, _f;
  const fromLink = (_b = (_a = $('a[href*="imdb.com/title/tt"]').first().attr("href")) == null ? void 0 : _a.match(/tt\d{7,}/)) == null ? void 0 : _b[0];
  if (fromLink) return fromLink;
  const fromMeta = (_d = (_c = $('meta[property="og:see_also"], meta[name="imdb"]').attr("content")) == null ? void 0 : _c.match(/tt\d{7,}/)) == null ? void 0 : _d[0];
  if (fromMeta) return fromMeta;
  const fromJsonLd = (_e = $('script[type="application/ld+json"]').text().match(/tt\d{7,}/)) == null ? void 0 : _e[0];
  if (fromJsonLd) return fromJsonLd;
  const fromHtml = (_f = $.html().match(/tt\d{7,}/)) == null ? void 0 : _f[0];
  return fromHtml || "";
}
__name(extractImdbId, "extractImdbId");
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    var _a;
    const { axios, cheerio } = providerContext;
    const currentBaseUrl = yield getBaseUrl("RareAnimes");
    const url = new URL(link, `${currentBaseUrl}/`).href;
    const baseUrl = url.split("/").slice(0, 3).join("/");
    try {
      const response = yield axios.get(url, {
        headers: __spreadProps(__spreadValues({}, headers), { Referer: baseUrl })
      });
      const $ = cheerio.load(response.data);
      const title = $("h1.entry-title").first().text().trim() || ((_a = $("meta[property='og:title']").attr("content")) == null ? void 0 : _a.trim()) || "Unknown Title";
      let image = $(".herald-post-thumbnail img").first().attr("src") || $("meta[property='og:image']").attr("content") || "";
      if (image.startsWith("//")) image = "https:" + image;
      let synopsis = "";
      $(".entry-content p").each((_, el) => {
        const p = $(el);
        const spans = p.find("span");
        if (spans.length === 0) return;
        if (/^Synopsis/i.test(spans.first().text().trim())) {
          synopsis = spans.last().text().trim();
          return false;
        }
      });
      if (!synopsis) {
        $(".entry-content p").each((_, el) => {
          const text = $(el).text().trim();
          if (text.startsWith("\u2705") && text.length > 40) {
            synopsis = text;
            return false;
          }
        });
      }
      const imdbId = extractImdbId($);
      const detectSeasonNumber = /* @__PURE__ */ __name(() => {
        let found = null;
        $(".entry-content p").each((_, el) => {
          const m = $(el).text().match(/Season\s*:?\s*0*(\d+)/i);
          if (m) {
            found = Number(m[1]);
            return false;
          }
        });
        if (found !== null) return found;
        const tm = title.match(/Season\s*0*(\d+)/i);
        return tm ? Number(tm[1]) : null;
      }, "detectSeasonNumber");
      const contentText = $(".entry-content").text();
      const hasEpisodes = /Episode\s+\d+/i.test(contentText);
      const type = hasEpisodes ? "series" : "movie";
      let cinemeta = null;
      if (imdbId) {
        try {
          cinemeta = yield getCinemetaMeta(imdbId, type, providerContext);
        } catch (e) {
          console.warn("RareAnimes: Cinemeta lookup failed", e);
        }
      }
      const linkList = [];
      if (hasEpisodes) {
        const seasonNumber = detectSeasonNumber();
        const langMap = /* @__PURE__ */ new Map();
        let currentEpisode = null;
        $(".entry-content p").each((_, el) => {
          const p = $(el);
          const fullText = p.text().trim();
          const epMatch = fullText.match(
            /^Episode\s+0*(\d+)\s*(?:[–\-—:]\s*(.+?))?\s*$/i
          );
          if (epMatch) {
            currentEpisode = {
              num: epMatch[1],
              name: (epMatch[2] || "").trim()
            };
            return;
          }
          if (!currentEpisode) return;
          const firstSpan = p.find("span").first();
          if (!firstSpan.length) return;
          const langMatch = firstSpan.text().trim().match(
            /^(Hindi\s*DUB|Hindi|Tamil|Telugu|English|Japanese|Korean|Malayalam|Kannada|Bengali|Marathi|Punjabi|Urdu|Multi[\s-]?Audio)\b/i
          );
          if (!langMatch) return;
          const langName = normalizeLang(langMatch[1]);
          const picked = pickBestServerLink($, p);
          if (!picked) return;
          const episodeTitle = currentEpisode.name ? `Episode ${currentEpisode.num} \u2013 ${currentEpisode.name}` : `Episode ${currentEpisode.num}`;
          if (!langMap.has(langName)) langMap.set(langName, []);
          langMap.get(langName).push({ title: episodeTitle, link: picked.href });
        });
        if (langMap.size > 0) {
          const langs = Array.from(langMap.keys()).sort((a, b) => {
            const ia = langOrderIndex(a);
            const ib = langOrderIndex(b);
            if (ia !== ib) return ia - ib;
            return a.localeCompare(b);
          });
          const videos = (cinemeta == null ? void 0 : cinemeta.videos) || [];
          for (const lang of langs) {
            const eps = langMap.get(lang);
            const enrichedEps = seasonNumber !== null && videos.length > 0 ? enrichCinemetaEpisodes(eps, videos, seasonNumber) : eps;
            const entryTitle = seasonNumber !== null ? langs.length === 1 ? `Season ${seasonNumber}` : `Season ${seasonNumber} \xB7 ${lang}` : lang;
            linkList.push({
              title: entryTitle,
              quality: "auto",
              directLinks: enrichedEps
            });
          }
        }
      }
      if (!hasEpisodes || linkList.length === 0) {
        const singleLinks = [];
        const seenLinks = /* @__PURE__ */ new Set();
        const seenServers = /* @__PURE__ */ new Set();
        $(".entry-content a").each((_, a) => {
          const $a = $(a);
          const href = $a.attr("href");
          if (!href) return;
          if (!href.includes("codedew.com/zipper") && !href.includes("hubcloud")) {
            return;
          }
          const anchorText = $a.text().trim();
          const server = matchServer(anchorText);
          if (!server) return;
          if (seenServers.has(server.name)) return;
          if (seenLinks.has(href)) return;
          seenServers.add(server.name);
          seenLinks.add(href);
          singleLinks.push({ title: server.name, link: href });
        });
        singleLinks.sort((a, b) => {
          var _a2, _b, _c, _d;
          const ao = (_b = (_a2 = SERVER_DEFS.find((d) => d.name === a.title)) == null ? void 0 : _a2.order) != null ? _b : 999;
          const bo = (_d = (_c = SERVER_DEFS.find((d) => d.name === b.title)) == null ? void 0 : _c.order) != null ? _d : 999;
          return ao - bo;
        });
        if (singleLinks.length > 0) {
          const seasonNumber = detectSeasonNumber();
          const fallbackTitle = type === "movie" ? "Movie" : seasonNumber !== null ? `Season ${seasonNumber}` : "Download";
          linkList.push({
            title: fallbackTitle,
            quality: "auto",
            directLinks: singleLinks
          });
        } else if (linkList.length === 0) {
          linkList.push({
            title: "Watch",
            quality: "auto",
            directLinks: [{ title: "Watch", link }]
          });
        }
      }
      const baseInfo = {
        title,
        synopsis,
        image,
        imdbId,
        type,
        linkList
      };
      return applyCinemeta(baseInfo, cinemeta);
    } catch (err) {
      throwProviderError("RareAnimes", "info", err);
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

