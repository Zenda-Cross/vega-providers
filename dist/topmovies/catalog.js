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

// providers/topmovies/catalog.ts
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
    title: "Netflix",
    filter: "/web-series/tv-shows-by-network/netflix"
  },
  {
    title: "Hotstar",
    filter: "/web-series/tv-shows-by-network/hotstar"
  },
  {
    title: "Amazon Prime",
    filter: "/web-series/tv-shows-by-network/amazon-prime-video"
  }
];
var genres = [
  {
    title: "Apple TV+",
    filter: "/ott/apple-tv"
  },
  {
    title: "Disney+",
    filter: "/ott/disney-plus"
  },
  {
    title: "Hulu",
    filter: "/ott/hulu"
  },
  {
    title: "Crunchyroll",
    filter: "/ott/crunchyroll"
  },
  {
    title: "Action",
    filter: "/movies-by-genre/action/"
  },
  {
    title: "Adventure",
    filter: "/movies-by-genre/adventure/"
  },
  {
    title: "Animation",
    filter: "/movies-by-genre/animated/"
  },
  {
    title: "Comedy",
    filter: "/movies-by-genre/comedy/"
  },
  {
    title: "Crime",
    filter: "/movies-by-genre/crime/"
  },
  {
    title: "Documentary",
    filter: "/movies-by-genre/documentary/"
  },
  {
    title: "Fantasy",
    filter: "/movies-by-genre/fantasy/"
  },
  {
    title: "Horror",
    filter: "/movies-by-genre/horror/"
  },
  {
    title: "Mystery",
    filter: "/movies-by-genre/mystery/"
  },
  {
    title: "Romance",
    filter: "/movies-by-genre/romance/"
  },
  {
    title: "Thriller",
    filter: "/movies-by-genre/thriller/"
  },
  {
    title: "Sci-Fi",
    filter: "/movies-by-genre/sci-fi/"
  }
];
exports.catalog = catalog;
exports.genres = genres;
// Annotate the CommonJS export names for ESM import in node:

