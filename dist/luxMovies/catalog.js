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

// providers/luxMovies/catalog.ts
var catalog_exports = {};
__export(catalog_exports, {
  catalog: () => catalog,
  genres: () => genres
});

var catalog = [
  {
    title: "New",
    filter: ""
  },
  {
    title: "Netflix",
    filter: "web-series/netflix"
  },
  {
    title: "Amazon Prime",
    filter: "web-series/amazon-prime-video"
  },
  {
    title: "4K Movies",
    filter: "movies-by-quality/2160p"
  }
];
var genres = [
  {
    title: "Action",
    filter: "category/movies-by-genres/action/"
  },
  {
    title: "Adventure",
    filter: "category/movies-by-genres/adventure/"
  },
  {
    title: "Animation",
    filter: "category/movies-by-genres/animation/"
  },
  {
    title: "Biography",
    filter: "category/movies-by-genres/biography/"
  },
  {
    title: "Comedy",
    filter: "category/movies-by-genres/comedy/"
  },
  {
    title: "Crime",
    filter: "category/movies-by-genres/crime/"
  },
  {
    title: "Documentary",
    filter: "category/movies-by-genres/documentary/"
  },
  {
    title: "Drama",
    filter: "category/movies-by-genres/drama/"
  },
  {
    title: "Family",
    filter: "category/movies-by-genres/family/"
  },
  {
    title: "Fantasy",
    filter: "category/movies-by-genres/fantasy/"
  },
  {
    title: "History",
    filter: "category/movies-by-genres/history/"
  },
  {
    title: "Horror",
    filter: "category/movies-by-genres/horror/"
  },
  {
    title: "Music",
    filter: "category/movies-by-genres/music/"
  },
  {
    title: "Mystery",
    filter: "category/movies-by-genres/mystery/"
  },
  {
    title: "Romance",
    filter: "category/movies-by-genres/romance/"
  },
  {
    title: "Sci-Fi",
    filter: "category/movies-by-genres/sci-fi/"
  },
  {
    title: "Sport",
    filter: "category/movies-by-genres/sport/"
  },
  {
    title: "Thriller",
    filter: "category/movies-by-genres/thriller/"
  },
  {
    title: "War",
    filter: "category/movies-by-genres/war/"
  },
  {
    title: "Western",
    filter: "category/movies-by-genres/western/"
  }
];
exports.catalog = catalog;
exports.genres = genres;
// Annotate the CommonJS export names for ESM import in node:

