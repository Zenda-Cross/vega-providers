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

// providers/getBaseUrl.ts
var getBaseUrl_exports = {};
__export(getBaseUrl_exports, {
  getBaseUrl: () => getBaseUrl
});
module.exports = __toCommonJS(getBaseUrl_exports);
var BASE_URLS = {
  "Moviesmod": "https://moviesmod.farm",
  "Animeflix": "https://ww3.animeflix.ltd",
  "Topmovies": "https://moviesleech.bar",
  "UhdMovies": "https://uhdmovies.casa",
  "filepress": "https://new14.filepress.store",
  "Vega": "https://vegamovies.navy",
  "lux": "https://rogmovies.cv",
  "drive": "https://new5.moviesdrives.my/",
  "multi": "https://multimovies.fyi",
  "w4u": "https://world4ufree.at",
  "extra": "https://extramovies.ist",
  "hdhub": "https://new2.hdhub4u.cl",
  "kat": "https://new.katmoviehd.top",
  "dc": "https://dramacool.org.ro",
  "dooflix": "https://dooflixpanel.com",
  "autoEmbed": "https://autoembed.cc",
  "aed": "https://watch-drama.autoembed.cc",
  "aea": "https://watch-anime.autoembed.cc",
  "tokyoinsider": "https://www.tokyoinsider.com",
  "consumet": "https://consumet.zendax.tech",
  "nfMirror": "https://net22.cc",
  "primewire": "https://primewire.pw",
  "rive": "https://www.rivestream.app",
  "kissKh": "https://kisskh.do",
  "vadapav": "https://vadapav.mov",
  "cinemaLuxe": "https://cinemalux.cyou",
  "showbox": "https://www.showbox.media",
  "animerulz": "https://animerulz.co",
  "moviesapi": "https://moviesapi.to",
  "ridomovies": "https://ridomovies.tv",
  "protonMovies": "https://m.protonmovies.space",
  "dramafull": "https://dramafull.cc",
  "nfCookie": "https://userverify.netmirror.app",
  "embedsu": "https://moviemaze.cc",
  "filmyfly": "https://new2.filmyfiy.org",
  "4khdhub": "https://4khdhub.one",
  "moviezwap": "https://www.moviezwap.llc/",
  "9xflix": "https://soft-water-2a42.flixoflixx.workers.dev",
  "movieBox": "https://api6.aoneroom.com",
  "cinevood": "https://kmmovies.space",
  "kmmovies": "https://kmmovies.lol",
  "zeefliz": "https://zeefliz.beer",
  "katmoviefix": "https://katmoviefix.study",
  "movies4u": "https://movies4u.mw",
  "joya9tv": "https://joya9tv1.com",
  "skymovieshd": "https://skymovieshd.ceo",
  "1cinevood": "https://one.1cinevood.live",
  "uniquestream": "https://anime.uniquestream.net",
  "katdrama": "https://new.katdrama.my",
  "kdhindidubbed": "https://kdhindidubbed.cfd",
  "kdramasmaza": "https://kdramasmaza.net"
};
var getBaseUrl = /* @__PURE__ */ __name((providerValue) => __async(null, null, function* () {
  try {
    const baseUrl = BASE_URLS[providerValue] || "";
    return baseUrl;
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    return BASE_URLS[providerValue] || "";
  }
}), "getBaseUrl");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getBaseUrl
});
