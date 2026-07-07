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
  catalog: () => catalog,
  genres: () => genres
});

var catalog = [
  {
    title: "Trending",
    filter: "/trending/"
  },
  {
    title: "Netflix",
    filter: "/genre/netflix/"
  },
  {
    title: "Amazon Prime",
    filter: "/genre/amazon-prime/"
  },
  {
    title: "Disney Hotstar",
    filter: "/genre/disney-hotstar/"
  }
];
var genres = [
  {
    title: "Action",
    filter: "/genre/action/"
  },
  {
    title: "Adventure",
    filter: "/genre/adventure/"
  },
  {
    title: "Animation",
    filter: "/genre/animation/"
  },
  {
    title: "Comedy",
    filter: "/genre/comedy/"
  },
  {
    title: "Crime",
    filter: "/genre/crime/"
  },
  {
    title: "Drama",
    filter: "/genre/drama/"
  },
  {
    title: "Family",
    filter: "/genre/family/"
  },
  {
    title: "Fantasy",
    filter: "/genre/fantasy/"
  },
  {
    title: "History",
    filter: "/genre/history/"
  },
  {
    title: "Horror",
    filter: "/genre/horror/"
  },
  {
    title: "Mystery",
    filter: "/genre/mystery/"
  },
  {
    title: "Romance",
    filter: "/genre/romance/"
  },
  {
    title: "Science Fiction",
    filter: "/genre/science-fiction/"
  },
  {
    title: "Thriller",
    filter: "/genre/thriller/"
  }
];
exports.catalog = catalog;
exports.genres = genres;
// Annotate the CommonJS export names for ESM import in node:

