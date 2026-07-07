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

// providers/world4u/catalog.ts
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
    title: "Hollywood",
    filter: "/category/hollywood"
  },
  {
    title: "Bollywood",
    filter: "/category/bollywood"
  },
  {
    title: "Web Series",
    filter: "/category/web-series"
  }
];
var genres = [
  { title: "South", filter: "/category/hindi-dubbed-movies/south-indian" },
  { title: "Punjabi", filter: "/category/punjabi" },
  { title: "Marathi", filter: "/category/bollywood/marathi" },
  { title: "Gujarati", filter: "/category/gujarati" },
  { title: "Bollywood", filter: "/category/bollywood" },
  { title: "Hollywood", filter: "/category/hollywood" }
];
exports.catalog = catalog;
exports.genres = genres;
// Annotate the CommonJS export names for ESM import in node:

