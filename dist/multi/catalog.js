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

// providers/multi/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog
});

var catalog = [
  { title: "Trending", filter: "" },
  { title: "Movies", filter: "movies" },
  { title: "Series", filter: "series" },
  { title: "K-drama", filter: "genre/k-drama" }
  /*// OTT
    { title: "Amazon Prime", filter: "genre/amazon-prime" },
    { title: "Jio Hotstar", filter: "genre/disney-hotstar" },
    { title: "Jio OTT", filter: "genre/jio-ott" },
    { title: "K-drama", filter: "genre/k-drama" },
    { title: "MX Player", filter: "genre/mx-player" },
    { title: "Netflix", filter: "genre/netflix" },
    { title: "Sony Liv", filter: "genre/sony-liv" },
    { title: "Zee 5", filter: "genre/zee-5" },
  
    // Genre
    { title: "Action", filter: "genre/action" },*/
];
exports.catalog = catalog;
// Annotate the CommonJS export names for ESM import in node:

