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

// providers/multi/stream.ts
var stream_exports = {};
__export(stream_exports, {
  getStream: () => getStream
});


// providers/extractors/iqst.ts
var API = "https://streams.iqsmartgames.com";
var PLAYER = "https://pro.iqsmartgames.com";
var REFERER = "https://multimovies.garden/";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var KNOWN_XVID_HOSTS = {
  "hanerix.com": true,
  "morencius.com": true,
  "vibuxer.com": true,
  "n1mwq.org": true
};
function buildHeaders() {
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": UA,
    Referer: REFERER
  };
}
__name(buildHeaders, "buildHeaders");
function deEscape(s) {
  return String(s).replace(/\\\//g, "/").replace(/\\u([0-9a-fA-F]{4})/g, function(_m, h) {
    return String.fromCharCode(parseInt(h, 16));
  });
}
__name(deEscape, "deEscape");
function b64urlDecode(s) {
  const input = String(s || "").trim().replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - input.length % 4);
  try {
    return atob(input + pad);
  } catch (e) {
    return "";
  }
}
__name(b64urlDecode, "b64urlDecode");
function hostOf(u) {
  try {
    return new URL(u).hostname;
  } catch (e) {
    return "";
  }
}
__name(hostOf, "hostOf");
function absUrl(base, rel) {
  try {
    return new URL(rel, base).toString();
  } catch (e) {
    return "";
  }
}
__name(absUrl, "absUrl");
function parseMaybeJson(input) {
  if (input == null) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
}
__name(parseMaybeJson, "parseMaybeJson");
var DIGITS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function baseN(num, b) {
  if (num === 0) return "0";
  let out = "";
  while (num > 0) {
    out = DIGITS[num % b] + out;
    num = Math.floor(num / b);
  }
  return out;
}
__name(baseN, "baseN");
function unpackJs(source) {
  const m = source.match(
    new RegExp("\\}\\s*\\(\\s*'(.*?)'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*'(.*?)'\\s*\\.split\\('\\|'\\)", "s")
  );
  if (!m) return null;
  let p = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  const a = parseInt(m[2], 10);
  let c = parseInt(m[3], 10);
  const k = m[4].split("|");
  while (c-- > 0) {
    if (c < k.length && k[c]) {
      const token = baseN(c, a);
      p = p.replace(new RegExp("\\b" + token + "\\b", "g"), function() {
        return k[c];
      });
    }
  }
  return p;
}
__name(unpackJs, "unpackJs");
function extractFileList(root) {
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.result)) return root.result;
  if (Array.isArray(root.files)) return root.files;
  if (Array.isArray(root.filelist)) return root.filelist;
  if (Array.isArray(root.sources)) return root.sources;
  if (root.data && Array.isArray(root.data.files)) return root.data.files;
  if (root.result && Array.isArray(root.result.files)) return root.result.files;
  if (Array.isArray(root)) return root;
  return [];
}
__name(extractFileList, "extractFileList");
function fetchFiles(embedUrl, axios, headers, signal) {
  return __async(this, null, function* () {
    const res = yield axios.get(embedUrl, { headers, signal, timeout: 7e3 });
    const html = res.data;
    console.log("[iqst] embed bytes: " + html.length);
    const varOf = /* @__PURE__ */ __name(function(name) {
      const re = new RegExp(
        "(?:var|let|const)\\s+" + name + `\\s*=\\s*["\\']([^"\\']*)["\\']`
      );
      const m = html.match(re);
      return m ? m[1] : "";
    }, "varOf");
    const finalId = varOf("FinalID");
    const idType = varOf("idType");
    const key = varOf("myKey");
    const season = varOf("season");
    const epname = varOf("epname");
    console.log(
      "[iqst] FinalID=" + (finalId || "(miss)") + " idType=" + (idType || "(miss)") + " key=" + (key ? "yes" : "(miss)")
    );
    if (!finalId || !key) return [];
    const paths = [];
    if (season && epname) {
      paths.push(
        API + "/myseriesapi?" + idType + "=" + encodeURIComponent(finalId) + "&season=" + season + "&epname=" + encodeURIComponent(epname) + "&key=" + key,
        API + "/myseriesapi?id=" + encodeURIComponent(finalId) + "&season=" + season + "&epname=" + encodeURIComponent(epname) + "&key=" + key,
        API + "/myseriesapi?imdbid=" + encodeURIComponent(finalId) + "&season=" + season + "&epname=" + encodeURIComponent(epname) + "&key=" + key
      );
    } else {
      paths.push(
        API + "/mymovieapi?" + idType + "=" + encodeURIComponent(finalId) + "&key=" + key,
        API + "/mymovieapi?id=" + encodeURIComponent(finalId) + "&key=" + key,
        API + "/mymovieapi?imdbid=" + encodeURIComponent(finalId) + "&key=" + key,
        API + "/mymovieapi?tmdbid=" + encodeURIComponent(finalId) + "&key=" + key,
        API + "/mymovieapi?type=imdbid&id=" + encodeURIComponent(finalId) + "&key=" + key
      );
    }
    for (let pi = 0; pi < paths.length; pi++) {
      const apiPath = paths[pi];
      try {
        const apiRes = yield axios.get(apiPath, {
          headers: Object.assign({}, headers, { Referer: API + "/" }),
          signal,
          timeout: 7e3,
          // Force axios to return raw text so we control parsing
          transformResponse: [(data) => data]
        });
        const parsed = parseMaybeJson(apiRes.data);
        if (!parsed) {
          console.log(
            "[iqst] " + apiPath + " -> unparseable (" + typeof apiRes.data + "): " + String(apiRes.data).slice(0, 200)
          );
          continue;
        }
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          console.log("[iqst] response keys: " + Object.keys(parsed).join(","));
        }
        const list = extractFileList(parsed);
        if (list.length === 0) {
          console.log("[iqst] " + apiPath + " -> 0 files");
          continue;
        }
        console.log("[iqst] " + apiPath + " -> " + list.length + " file(s)");
        const out = [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i] || {};
          const slug = String(
            item.fileslug || item.slug || item.file_slug || item.id || ""
          ).trim();
          if (!slug) continue;
          out.push({
            slug,
            name: item.filename || item.name || item.title || "",
            size: item.fsize || item.size || ""
          });
        }
        if (out.length > 0) return out;
      } catch (e) {
        console.log("[iqst] " + apiPath + " failed: " + (e && e.message));
      }
    }
    return [];
  });
}
__name(fetchFiles, "fetchFiles");
function fetchMirrors(slug, axios, headers, signal) {
  return __async(this, null, function* () {
    const body = new URLSearchParams({
      sid: slug,
      UserFavSite: "",
      currentDomain: '["streams.iqsmartgames.com","pro.iqsmartgames.com"]'
    }).toString();
    const res = yield axios.post(PLAYER + "/embedhelper2.php", body, {
      headers: Object.assign({}, headers, {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: PLAYER + "/"
      }),
      signal,
      timeout: 7e3,
      transformResponse: [(data) => data]
    });
    const root = parseMaybeJson(res.data);
    if (!root || typeof root !== "object") {
      console.log("[iqst] mirrors: unparseable response");
      return [];
    }
    const sources = root.sources || {};
    let codes = {};
    const mresult = root.mresult;
    if (mresult) {
      if (typeof mresult === "object") {
        codes = mresult;
      } else if (typeof mresult === "string") {
        const direct = parseMaybeJson(mresult);
        if (direct && typeof direct === "object") {
          codes = direct;
        } else {
          const decoded = b64urlDecode(mresult);
          const parsed = parseMaybeJson(decoded);
          if (parsed && typeof parsed === "object") codes = parsed;
        }
      }
    }
    const out = [];
    const keys = Object.keys(codes);
    console.log("[iqst] mirrors: " + keys.length + " code(s)");
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const src = sources[k];
      if (!src) continue;
      const siteUrl = String(src.siteUrl || "").trim();
      const code = String(codes[k] || "").trim();
      if (!siteUrl || !code) continue;
      out.push({
        siteUrl,
        friendlyName: src.friendlyName || "",
        code
      });
    }
    return out;
  });
}
__name(fetchMirrors, "fetchMirrors");
function extractLinks(unpacked, base) {
  const absolute = [];
  const relative = [];
  const seenA = {};
  const seenR = {};
  const kvRe = /"(?:hls\d|file|mp4)"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = kvRe.exec(unpacked)) !== null) {
    const u = deEscape(m[1]);
    if (!u) continue;
    if (/^https?:\/\//i.test(u)) {
      if (!seenA[u]) {
        seenA[u] = true;
        absolute.push(u);
      }
    } else {
      const full = absUrl(base + "/", u);
      if (full && !seenR[full]) {
        seenR[full] = true;
        relative.push(full);
      }
    }
  }
  const rawRe = /https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g;
  while ((m = rawRe.exec(unpacked)) !== null) {
    const u = deEscape(m[0]);
    if (!seenA[u]) {
      seenA[u] = true;
      absolute.push(u);
    }
  }
  return absolute.concat(relative);
}
__name(extractLinks, "extractLinks");
function resolveXvidStyle(pageUrl, axios, headers, signal) {
  return __async(this, null, function* () {
    const u = new URL(pageUrl);
    const base = u.protocol + "//" + u.host;
    const res = yield axios.get(pageUrl, {
      headers: Object.assign({}, headers, { Referer: PLAYER + "/" }),
      signal,
      timeout: 7e3
    });
    const unpacked = unpackJs(res.data) || "";
    if (!unpacked) return [];
    const links = extractLinks(unpacked, base);
    const out = [];
    for (let i = 0; i < links.length; i++) {
      out.push({ url: links[i], headers: { Referer: base + "/" } });
    }
    return out;
  });
}
__name(resolveXvidStyle, "resolveXvidStyle");
function resolveGeneric(pageUrl, axios, headers, signal) {
  return __async(this, null, function* () {
    const res = yield axios.get(pageUrl, { headers, signal, timeout: 7e3 });
    const html = res.data;
    const seen = {};
    const out = [];
    const re = /https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const u = deEscape(m[0]);
      if (!seen[u]) {
        seen[u] = true;
        out.push({ url: u, headers: {} });
      }
    }
    return out;
  });
}
__name(resolveGeneric, "resolveGeneric");
function dispatchMirror(mirror, axios, headers, signal) {
  return __async(this, null, function* () {
    const pageUrl = absUrl(mirror.siteUrl, mirror.code);
    if (!pageUrl) return [];
    const host = hostOf(pageUrl);
    if (KNOWN_XVID_HOSTS[host]) return resolveXvidStyle(pageUrl, axios, headers, signal);
    return resolveGeneric(pageUrl, axios, headers, signal);
  });
}
__name(dispatchMirror, "dispatchMirror");
function iqstExtractor(link, signal, axios, _cheerio, _headers, _providerContext) {
  return __async(this, null, function* () {
    const streamLinks = [];
    const t0 = Date.now();
    try {
      console.log("[iqst] -> " + link);
      const headers = buildHeaders();
      const files = yield fetchFiles(link, axios, headers, signal);
      if (files.length === 0) {
        console.log("[iqst] no files found");
        return [];
      }
      const mirrorJobs = files.map(function(f) {
        return fetchMirrors(f.slug, axios, headers, signal).then(
          function(mirrors) {
            return { file: f, mirrors };
          },
          function(e) {
            console.warn("[iqst] mirrors " + f.slug + ": " + (e && e.message));
            return { file: f, mirrors: [] };
          }
        );
      });
      const fileMirrors = yield Promise.all(mirrorJobs);
      const linkJobs = [];
      const linkLabels = [];
      for (let i = 0; i < fileMirrors.length; i++) {
        const fm = fileMirrors[i];
        for (let j = 0; j < fm.mirrors.length; j++) {
          const mirror = fm.mirrors[j];
          linkLabels.push(mirror.friendlyName || "Mirror");
          linkJobs.push(
            dispatchMirror(mirror, axios, headers, signal).catch(function(e) {
              console.warn(
                "[iqst] mirror " + mirror.friendlyName + ": " + (e && e.message)
              );
              return [];
            })
          );
        }
      }
      const linkResults = yield Promise.all(linkJobs);
      for (let i = 0; i < linkResults.length; i++) {
        const links = linkResults[i];
        const label = linkLabels[i];
        for (let k = 0; k < links.length; k++) {
          const entry = links[k];
          const stream = {
            server: "iqst (" + label + ")",
            link: entry.url,
            type: "m3u8"
          };
          if (entry.headers && Object.keys(entry.headers).length > 0) {
            stream.headers = entry.headers;
          }
          streamLinks.push(stream);
        }
      }
      console.log(
        "[iqst] " + streamLinks.length + " streams in " + (Date.now() - t0) + "ms"
      );
      return streamLinks;
    } catch (err) {
      console.error("[iqst] error: " + (err && err.message));
      return [];
    }
  });
}
__name(iqstExtractor, "iqstExtractor");

// providers/extractors/vidbolt.ts
var MOVY_KEY = "0f461eaa465bb2a7acd037425217f2f209ef540a3171e1ac";
var CURX_KEY = "streamrip_secret_2026";
var SCRAPER = "https://scraper.vidbolt.xyz";
var REFERER2 = "https://vidbolt.xyz/";
var UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
function buildHeaders2() {
  return {
    Accept: "application/json, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": UA2,
    Referer: REFERER2,
    Origin: "https://vidbolt.xyz"
  };
}
__name(buildHeaders2, "buildHeaders");
function parseVidboltUrl(link) {
  const u = new URL(link);
  const m = u.pathname.match(/^\/(movie|tv)\/(\d+)/);
  if (!m) throw new Error("Unsupported VidBolt URL: " + link);
  const out = { isTv: m[1] === "tv", tmdbId: m[2] };
  if (out.isTv) {
    const se = u.pathname.match(/^\/tv\/\d+\/(\d+)\/(\d+)/);
    if (se) {
      out.season = Number(se[1]);
      out.episode = Number(se[2]);
    }
  }
  const q = u.searchParams;
  const qTitle = q.get("title");
  const qYear = q.get("year");
  const qImdb = q.get("imdb");
  if (qTitle) out.title = qTitle;
  if (qYear) out.year = qYear;
  if (qImdb) out.imdbId = qImdb;
  return out;
}
__name(parseVidboltUrl, "parseVidboltUrl");
function extractSources(root) {
  if (!root) return [];
  if (Array.isArray(root)) return root;
  if (Array.isArray(root.sources)) return root.sources;
  if (root.data) {
    if (Array.isArray(root.data)) return root.data;
    if (Array.isArray(root.data.sources)) return root.data.sources;
  }
  if (root.result) {
    if (Array.isArray(root.result)) return root.result;
    if (Array.isArray(root.result.sources)) return root.result.sources;
  }
  if (Array.isArray(root.files)) return root.files;
  if (Array.isArray(root.links)) return root.links;
  return [];
}
__name(extractSources, "extractSources");
function addSources(root, label, results) {
  const sources = extractSources(root);
  let any = false;
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i] || {};
    let url = String(src.url || src.link || src.file || src.src || "");
    if (!url) continue;
    if (url.indexOf("//") === 0) url = "https:" + url;
    if (url.indexOf("http") !== 0) continue;
    const quality = String(src.quality || src.label || src.resolution || "HD");
    const language = String(src.language || src.lang || src.audio || "");
    const langTag = language && language.toLowerCase() !== "original" ? " " + language : "";
    results.push({
      server: (label + " " + quality + langTag).trim(),
      link: url,
      type: /\.m3u8/i.test(url) ? "m3u8" : "mp4"
    });
    any = true;
  }
  return any;
}
__name(addSources, "addSources");
function tryGet(axios, url, headers, signal, label) {
  return __async(this, null, function* () {
    try {
      const r = yield axios.get(url, {
        headers,
        signal,
        timeout: 1e4,
        validateStatus: /* @__PURE__ */ __name(function(s) {
          return s < 500;
        }, "validateStatus")
      });
      if (r.status >= 400) {
        console.warn("[vidbolt] " + label + " -> " + r.status);
        return null;
      }
      return r.data;
    } catch (e) {
      console.warn("[vidbolt] " + label + " failed: " + (e && e.message || e));
      return null;
    }
  });
}
__name(tryGet, "tryGet");
function vidboltExtractor(link, signal, axios, _cheerio, _headers, _providerContext) {
  return __async(this, null, function* () {
    const streamLinks = [];
    const t0 = Date.now();
    let parsed;
    try {
      parsed = parseVidboltUrl(link);
    } catch (e) {
      console.error("[vidbolt] url: " + (e && e.message));
      return streamLinks;
    }
    const isTv = parsed.isTv;
    const tmdbId = parsed.tmdbId;
    const season = parsed.season;
    const episode = parsed.episode;
    const title = parsed.title || "";
    const year = parsed.year || "";
    const imdbId = parsed.imdbId || "";
    console.log("[vidbolt] -> " + link);
    console.log(
      "[vidbolt] type=" + (isTv ? "tv" : "movie") + " tmdb=" + tmdbId + (isTv ? " s=" + season + " e=" + episode : "") + (title ? " title=" + title : "") + (imdbId ? " imdb=" + imdbId : "")
    );
    const headers = buildHeaders2();
    if (!isTv) {
      const movyUrl = "https://api.movy.lol/api/source/" + encodeURIComponent(tmdbId) + "?api_key=" + MOVY_KEY + "&apikey=" + MOVY_KEY;
      try {
        const movy = yield tryGet(axios, movyUrl, headers, signal, "Movy");
        if (movy) {
          const added = addSources(movy, "Orion", streamLinks);
          if (added) console.log("[vidbolt] Orion -> " + streamLinks.length);
        }
      } catch (e) {
      }
    }
    if (isTv && season != null && episode != null) {
      const curxUrl = "https://img.animecurx.tech/api/tv/" + encodeURIComponent(tmdbId) + "/" + encodeURIComponent(String(season)) + "/" + encodeURIComponent(String(episode)) + "?api_key=" + CURX_KEY + "&apikey=" + CURX_KEY;
      try {
        const curx = yield tryGet(axios, curxUrl, headers, signal, "AnimeCurx");
        if (curx) {
          const added = addSources(curx, "Orion", streamLinks);
          if (added) console.log("[vidbolt] AnimeCurx -> " + streamLinks.length);
        }
      } catch (e) {
      }
    }
    const idForScraper = imdbId || "tmdb" + tmdbId;
    const streamType = isTv ? "tv" : "movie";
    const epTag = isTv && season != null && episode != null ? " S" + season + "E" + episode : "";
    const titleFull = title ? title + epTag : "";
    const quasarParams = new URLSearchParams();
    quasarParams.append("tmdbId", tmdbId);
    if (imdbId) quasarParams.append("imdbId", imdbId);
    if (titleFull) quasarParams.append("title", titleFull);
    if (year) quasarParams.append("year", year);
    if (isTv && season != null) quasarParams.append("season", String(season));
    if (isTv && episode != null) quasarParams.append("episode", String(episode));
    const saffronParams = new URLSearchParams();
    saffronParams.append("tmdbId", tmdbId);
    if (imdbId) saffronParams.append("imdbId", imdbId);
    if (titleFull) saffronParams.append("title", titleFull);
    if (year) saffronParams.append("year", year);
    if (isTv && season != null) saffronParams.append("season", String(season));
    if (isTv && episode != null) saffronParams.append("episode", String(episode));
    const callistoParams = new URLSearchParams();
    callistoParams.append("tmdbId", tmdbId);
    if (imdbId) callistoParams.append("imdbId", imdbId);
    if (titleFull) callistoParams.append("title", titleFull);
    if (year) callistoParams.append("year", year);
    if (isTv && season != null) callistoParams.append("season", String(season));
    if (isTv && episode != null) callistoParams.append("episode", String(episode));
    const jobs = [
      {
        label: "Quasar",
        url: SCRAPER + "/scrape/Quasar/" + streamType + "/" + encodeURIComponent(idForScraper) + "?" + quasarParams.toString()
      },
      {
        label: "Saffron",
        url: SCRAPER + "/scrape/Saffron/" + streamType + "/" + encodeURIComponent(idForScraper) + "?" + saffronParams.toString()
      },
      {
        label: "Callisto",
        url: SCRAPER + "/scrape/Callisto/" + streamType + "/" + encodeURIComponent(idForScraper) + "?" + callistoParams.toString()
      }
    ];
    const results = yield Promise.all(
      jobs.map(function(job) {
        return tryGet(axios, job.url, headers, signal, job.label).then(function(data) {
          return { label: job.label, data };
        });
      })
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.data) continue;
      const added = addSources(r.data, r.label, streamLinks);
      if (added) {
        console.log("[vidbolt] " + r.label + " -> " + streamLinks.length + " total");
      }
    }
    const seen = /* @__PURE__ */ new Set();
    const deduped = [];
    for (let i = 0; i < streamLinks.length; i++) {
      const s = streamLinks[i];
      if (!s.link || seen.has(s.link)) continue;
      seen.add(s.link);
      deduped.push(s);
    }
    console.log(
      "[vidbolt] " + deduped.length + " streams in " + (Date.now() - t0) + "ms"
    );
    return deduped;
  });
}
__name(vidboltExtractor, "vidboltExtractor");

// providers/extractors/cineverse.ts
var HUB = "https://rozgarlelo.modiplay.xyz";
var REFERER_HUB = "https://multimovies.garden/";
var MOBILE_UA = "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36";
function buildHeaders3() {
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    "User-Agent": MOBILE_UA,
    Referer: HUB + "/"
  };
}
__name(buildHeaders3, "buildHeaders");
function buildPlaybackHeaders() {
  return {
    "User-Agent": MOBILE_UA,
    Accept: "*/*",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    Origin: HUB,
    Referer: HUB + "/"
  };
}
__name(buildPlaybackHeaders, "buildPlaybackHeaders");
function deEscape2(s) {
  return String(s).replace(/\\+u([0-9a-fA-F]{4})/g, function(_m, h) {
    return String.fromCharCode(parseInt(h, 16));
  }).replace(/\\+\//g, "/").replace(/&amp;/g, "&");
}
__name(deEscape2, "deEscape");
function extractM3u8(html) {
  const decoded = deEscape2(html);
  let m = decoded.match(/var\s+directSrc\s*=\s*["']([^"']+\.m3u8[^"']*)["']/i);
  if (m && m[1] && /^https?:\/\//i.test(m[1])) {
    return m[1].trim();
  }
  m = decoded.match(
    /["']((?:\/|https?:\/\/)[^"'\s<>]*stream_proxy\.php\?url=[^"'\s<>]+)["']/i
  );
  if (m && m[1]) {
    let url = m[1].trim();
    if (url.indexOf("http") !== 0) {
      url = HUB + (url.indexOf("/") === 0 ? url : "/" + url);
    }
    if (!/[?&]seg=/.test(url)) {
      url += "&seg=direct";
    }
    return url;
  }
  m = decoded.match(/https?:\/\/[^"'\s\\<>]+\.m3u8[^"'\s\\<>]*/i);
  if (m) return m[0];
  m = decoded.match(/["'](\/hls\/[^"'\s]+master\.m3u8[^"'\s]*)["']/i);
  if (m && m[1]) return HUB + m[1];
  return null;
}
__name(extractM3u8, "extractM3u8");
function parseServers(html) {
  const out = [];
  const seen = {};
  const re = /switchServer\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const platform = m[2];
    if (!platform || seen[platform]) continue;
    seen[platform] = true;
    out.push({ platform, name: m[3], code: m[4] });
  }
  return out;
}
__name(parseServers, "parseServers");
function resolveProxyPage(server, axios, headers, signal) {
  return __async(this, null, function* () {
    const proxyUrl = HUB + "/proxy.php?p=" + encodeURIComponent(server.platform) + "&c=" + encodeURIComponent(server.code) + "&title=" + encodeURIComponent("") + "&site_ref=" + encodeURIComponent(REFERER_HUB) + "&noredirect=1";
    console.log("[cineverse] proxy " + server.platform + " (" + server.code + ")");
    let resp;
    try {
      resp = yield axios.get(proxyUrl, {
        headers,
        signal,
        timeout: 6e3,
        maxRedirects: 0,
        validateStatus: /* @__PURE__ */ __name(function() {
          return true;
        }, "validateStatus")
      });
    } catch (e) {
      console.warn("[cineverse] " + server.platform + " failed: " + (e && e.message));
      return null;
    }
    const html = typeof resp.data === "string" ? resp.data : String(resp.data || "");
    console.log("[cineverse] " + server.platform + " -> " + resp.status + " (" + html.length + ")");
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers && (resp.headers.location || resp.headers["Location"]) || "";
      if (loc && /\.m3u8/i.test(loc)) return { url: loc };
      return null;
    }
    const m3u8 = extractM3u8(html);
    if (!m3u8) {
      console.log("[cineverse] " + server.platform + " -> no m3u8");
      return null;
    }
    console.log("[cineverse] " + server.platform + " -> " + m3u8);
    return { url: m3u8 };
  });
}
__name(resolveProxyPage, "resolveProxyPage");
function cineverseExtractor(link, signal, axios, _cheerio, _headers, _providerContext) {
  return __async(this, null, function* () {
    const streamLinks = [];
    const t0 = Date.now();
    const headers = buildHeaders3();
    console.log("[cineverse] -> " + link);
    let html = "";
    try {
      const r = yield axios.get(link, {
        headers: Object.assign({}, headers, { Referer: REFERER_HUB }),
        signal,
        timeout: 6e3,
        validateStatus: /* @__PURE__ */ __name(function() {
          return true;
        }, "validateStatus")
      });
      html = typeof r.data === "string" ? r.data : String(r.data || "");
      console.log("[cineverse] embed -> " + r.status + " (" + html.length + ")");
    } catch (e) {
      console.error("[cineverse] embed: " + (e && e.message));
      return streamLinks;
    }
    const servers = parseServers(html);
    console.log("[cineverse] servers=" + servers.length);
    if (servers.length === 0) {
      console.log("[cineverse] embed head: " + html.slice(0, 200).replace(/\s+/g, " "));
      return [];
    }
    const results = yield Promise.allSettled(
      servers.map(function(s) {
        return resolveProxyPage(s, axios, headers, signal);
      })
    );
    const playbackHeaders = buildPlaybackHeaders();
    const seenLinks = /* @__PURE__ */ new Set();
    let dropped = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled" || !r.value) continue;
      const url = r.value.url;
      if (!url) continue;
      if (seenLinks.has(url)) {
        dropped++;
        continue;
      }
      seenLinks.add(url);
      streamLinks.push({
        server: "Cineverse " + servers[i].name,
        link: url,
        type: "m3u8",
        headers: playbackHeaders
      });
    }
    if (dropped > 0) {
      console.log("[cineverse] dropped " + dropped + " duplicate link(s)");
    }
    console.log(
      "[cineverse] " + streamLinks.length + " streams in " + (Date.now() - t0) + "ms"
    );
    return streamLinks;
  });
}
__name(cineverseExtractor, "cineverseExtractor");

// providers/multi/stream.ts
var REFERER3 = "https://multimovies.garden/";
var BASE_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: REFERER3
};
var CINEVERSE_RE = /rozgarlelo\.modiplay\.xyz\/embed\//i;
var IQST_RE = /streams\.iqsmartgames\.com\/embed\//i;
var VIDBOLT_RE = /vidbolt\.xyz\//i;
var VIDOUT_RE = /vidout\.pages\.dev\//i;
var FILMU_RE = /embed\.filmu\.in\//i;
var TIMEOUTS = {
  Cineverse: 15e3,
  // reduced from 30s, this one was the killer
  "GD mirror": 12e3,
  VIDOUT: 5e3,
  Filmu: 1e4,
  VidBolt: 12e3,
  default: 12e3
};
function raceWithAbort(run, ms, label) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ctrl.abort();
      } catch (e) {
      }
      reject(new Error(label + " timeout " + ms + "ms"));
    }, ms);
    run(ctrl.signal).then(
      (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}
__name(raceWithAbort, "raceWithAbort");
function parseServersCheerio(html, cheerio) {
  const out = [];
  let $;
  try {
    $ = cheerio.load(html, { decodeEntities: false }, false);
  } catch (e) {
    console.warn("[stream] cheerio.load failed: " + (e && e.message));
    return out;
  }
  const selectors = [
    "button.server-chip[data-url]",
    "#playerServerGrid button[data-url]",
    ".server-grid button[data-url]",
    "[data-url][data-server-index]",
    "button[data-url]"
  ];
  let nodes = null;
  for (let i = 0; i < selectors.length; i++) {
    try {
      const found = $(selectors[i]);
      if (found && found.length > 0) {
        nodes = found;
        break;
      }
    } catch (e) {
    }
  }
  if (!nodes) return out;
  nodes.each(function(_i, el) {
    try {
      const $el = $(el);
      const url = String($el.attr("data-url") || "").trim();
      if (!url) return;
      const id = String($el.attr("data-id") || "");
      const index = parseInt(String($el.attr("data-server-index") || "0"), 10) || 0;
      let name = "";
      try {
        name = String($el.find(".server-name").text() || "").trim();
      } catch (e) {
      }
      if (!name) name = id || "Server";
      out.push({ id, name, url, index });
    } catch (e) {
    }
  });
  return out;
}
__name(parseServersCheerio, "parseServersCheerio");
function parseServersRegex(html) {
  const out = [];
  const re = /<button\b[^>]*\bdata-url\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/button>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const full = m[0];
    const url = String(m[1] || "").trim();
    const inner = m[2] || "";
    if (!url) continue;
    const idM = full.match(/\bdata-id\s*=\s*"([^"]*)"/i);
    const idxM = full.match(/\bdata-server-index\s*=\s*"([^"]*)"/i);
    const nameM = inner.match(/class\s*=\s*"server-name"[^>]*>([^<]*)</i);
    const id = idM ? idM[1] : "";
    let name = nameM ? String(nameM[1]).trim() : "";
    if (!name) name = id || "Server";
    out.push({
      id,
      name,
      url,
      index: idxM ? parseInt(idxM[1], 10) || 0 : 0
    });
  }
  return out;
}
__name(parseServersRegex, "parseServersRegex");
function parseServers2(html, cheerio) {
  let list = parseServersCheerio(html, cheerio);
  if (list.length === 0) list = parseServersRegex(html);
  const seen = {};
  const deduped = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (seen[s.url]) continue;
    seen[s.url] = true;
    deduped.push(s);
  }
  deduped.sort((a, b) => a.index - b.index);
  return deduped;
}
__name(parseServers2, "parseServers");
function resolveVidout(url, _mediaType, signal, ctx) {
  return __async(this, null, function* () {
    const out = [];
    const RAW = "https://raw.githubusercontent.com/Watchout2025/api/refs/heads/main";
    const idMatch = url.match(/\/movie\/([^/?#]+)/);
    if (!idMatch) return out;
    const primaryId = idMatch[1];
    const candidates = [primaryId];
    try {
      const u = new URL(url);
      const t = u.searchParams.get("tmdb");
      if (t && candidates.indexOf(t) < 0) candidates.push(t);
    } catch (e) {
    }
    const paths = [
      "/hls/movie/",
      "/movie/",
      "/hls/",
      "/"
    ];
    outer:
      for (let i = 0; i < candidates.length; i++) {
        const id = candidates[i];
        for (let j = 0; j < paths.length; j++) {
          const href = RAW + paths[j] + id;
          try {
            const r = yield ctx.axios.get(href, {
              headers: Object.assign({}, BASE_HEADERS, {
                Referer: "https://vidout.pages.dev/"
              }),
              signal
            });
            const body = String(r.data || "").trim();
            let hlsUrl = "";
            if (body.indexOf("http") === 0) {
              hlsUrl = body.split(/\s+/)[0];
            } else if (body.charAt(0) === "{") {
              try {
                const obj = JSON.parse(body);
                hlsUrl = String(obj.url || obj.hls || obj.link || "");
              } catch (e) {
              }
            }
            if (hlsUrl && hlsUrl.indexOf("http") === 0) {
              out.push({ server: "VIDOUT", link: hlsUrl, type: "m3u8" });
              break outer;
            }
          } catch (e) {
          }
        }
      }
    return out;
  });
}
__name(resolveVidout, "resolveVidout");
function resolveFilmu(url, mediaType, signal, ctx) {
  return __async(this, null, function* () {
    const out = [];
    const HOST = "https://embed.filmu.in";
    const idMatch = url.match(/\/(?:movie|tv)\/(\d+)/);
    if (!idMatch) return out;
    const tmdbId = idMatch[1];
    const apiPath = mediaType === "tv" ? HOST + "/api/singularity-tv?tmdb=" + tmdbId : HOST + "/api/singularity-movie?id=" + tmdbId;
    try {
      const r = yield ctx.axios.get(apiPath, {
        headers: Object.assign({}, BASE_HEADERS, {
          Referer: HOST + "/" + mediaType + "/" + tmdbId
        }),
        signal
      });
      const root = r.data || {};
      const base = root._base || "";
      const sources = Array.isArray(root.sources) ? root.sources : [];
      for (let i = 0; i < sources.length; i++) {
        const src = sources[i] || {};
        let u = String(src.url || "");
        if (!u) continue;
        if (u.indexOf("http") !== 0 && base) {
          try {
            u = new URL(u, base).toString();
          } catch (e) {
          }
        }
        if (u.indexOf("http") !== 0) continue;
        out.push({
          server: "Filmu " + (src.quality || "1080p"),
          link: u,
          type: "m3u8"
        });
      }
      if (out.length === 0) {
        let single = String(root.url || "");
        if (!single && root.multilingual) single = String(root.multilingual_url || "");
        if (single.indexOf("http") === 0) {
          out.push({
            server: "Filmu " + (root.quality || "1080p"),
            link: single,
            type: "m3u8"
          });
        } else if (root.m3u8_path && base) {
          try {
            out.push({
              server: "Filmu " + (root.quality || "1080p"),
              link: new URL(root.m3u8_path, base).toString(),
              type: "m3u8"
            });
          } catch (e) {
          }
        }
      }
    } catch (e) {
      console.warn("[stream] filmu: " + (e && e.message));
    }
    return out;
  });
}
__name(resolveFilmu, "resolveFilmu");
function routeServer(url, mediaType, signal, ctx) {
  return __async(this, null, function* () {
    const h = BASE_HEADERS;
    if (CINEVERSE_RE.test(url)) {
      return cineverseExtractor(url, signal, ctx.axios, ctx.cheerio, h, ctx);
    }
    if (IQST_RE.test(url)) {
      return iqstExtractor(url, signal, ctx.axios, ctx.cheerio, h, ctx);
    }
    if (VIDBOLT_RE.test(url)) {
      return vidboltExtractor(url, signal, ctx.axios, ctx.cheerio, h, ctx);
    }
    if (VIDOUT_RE.test(url)) {
      return resolveVidout(url, mediaType, signal, ctx);
    }
    if (FILMU_RE.test(url)) {
      return resolveFilmu(url, mediaType, signal, ctx);
    }
    return [];
  });
}
__name(routeServer, "routeServer");
function detectMediaType(type, link, html) {
  const t = (type || "").toLowerCase();
  if (t.indexOf("tv") >= 0 || t.indexOf("series") >= 0 || t.indexOf("show") >= 0)
    return "tv";
  if (t.indexOf("movie") >= 0 || t.indexOf("film") >= 0) return "movie";
  if (/\/tv\//i.test(link) || /\/series\//i.test(link)) return "tv";
  if (/\/movie\//i.test(link) || /\/film\//i.test(link)) return "movie";
  if (/\/tv\//i.test(html)) return "tv";
  return "movie";
}
__name(detectMediaType, "detectMediaType");
function getStream(_0) {
  return __async(this, arguments, function* ({
    link,
    type,
    signal,
    providerContext
  }) {
    const axios = providerContext.axios;
    const cheerio = providerContext.cheerio;
    const t0 = Date.now();
    let html = "";
    try {
      const res = yield axios.get(link, { headers: BASE_HEADERS, signal });
      html = res.data;
    } catch (e) {
      console.error("[stream] page load failed: " + (e && e.message));
      return [];
    }
    const servers = parseServers2(html, cheerio);
    console.log("[stream] " + servers.length + " chip(s) parsed");
    if (servers.length === 0) return [];
    const mediaType = detectMediaType(type, link, html);
    console.log("[stream] media type=" + mediaType + "  starting parallel run");
    const jobs = servers.map((server) => {
      const budget = TIMEOUTS[server.name] || TIMEOUTS.default;
      const t = Date.now();
      return raceWithAbort(
        (innerSignal) => routeServer(server.url, mediaType, innerSignal, providerContext),
        budget,
        server.name
      ).then(
        (streams) => {
          const dt = Date.now() - t;
          console.log("[stream] <- " + server.name + ": " + streams.length + " in " + dt + "ms");
          return { server, streams };
        },
        (e) => {
          const dt = Date.now() - t;
          console.warn("[stream] x " + server.name + " (" + dt + "ms): " + (e && e.message));
          return { server, streams: [] };
        }
      );
    });
    const settled = yield Promise.all(jobs);
    const streamLinks = [];
    const fallbacks = [];
    for (let i = 0; i < settled.length; i++) {
      const { server, streams } = settled[i];
      if (streams.length === 0) {
        fallbacks.push({
          server: server.name + " (embed)",
          link: server.url,
          type: "iframe"
        });
        continue;
      }
      for (let j = 0; j < streams.length; j++) {
        const ex = streams[j];
        const merged = {
          server: server.name + " / " + (ex.server || "stream"),
          link: ex.link,
          type: ex.type || "m3u8"
        };
        if (ex.headers) merged.headers = ex.headers;
        if (ex.quality) merged.quality = ex.quality;
        if (ex.subtitles) merged.subtitles = ex.subtitles;
        streamLinks.push(merged);
      }
    }
    console.log(
      "[stream] DONE " + streamLinks.length + " real + " + fallbacks.length + " iframe in " + (Date.now() - t0) + "ms"
    );
    if (streamLinks.length === 0 && fallbacks.length > 0) return fallbacks;
    return streamLinks;
  });
}
__name(getStream, "getStream");
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

