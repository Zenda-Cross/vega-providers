"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// providers/uhd/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});

var catalog = [
  {
    title: "Latest",
    filter: ""
  },
  {
    title: "Web Series",
    filter: "/web-series"
  },
  {
    title: "Movies",
    filter: "/movies"
  },
  {
    title: "4K HDR",
    filter: "/4k-hdr"
  }
];
var genres = [
  {
    title: "4K HEVC",
    filter: "/2160p-hevc"
  },
  {
    title: "HD 10bit",
    filter: "/1080p-10bit"
  },
  {
    title: "English Movies",
    filter: "/movies/english-movies"
  },
  {
    title: "Dual Audio",
    filter: "/movies/dual-audio-movies"
  }
];
exports.catalog = catalog;
exports.genres = genres;
// Annotate the CommonJS export names for ESM import in node:

