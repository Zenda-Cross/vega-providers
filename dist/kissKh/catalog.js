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

// providers/kissKh/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});

var catalog = [
  {
    title: "Latest",
    filter: "/api/DramaList/List?type=0&sub=0&country=0&status=0&order=2"
  },
  {
    title: "Hollywood",
    filter: "/api/DramaList/List?type=4&sub=0&country=0&status=0&order=2"
  },
  {
    title: "Anime",
    filter: "/api/DramaList/List?type=3&sub=0&country=0&status=0&order=2"
  },
  {
    title: "K Drama",
    filter: "/api/DramaList/List?type=0&sub=0&country=0&status=0&order=2"
  }
];
var genres = [];
exports.catalog = catalog;
exports.genres = genres;
// Annotate the CommonJS export names for ESM import in node:

