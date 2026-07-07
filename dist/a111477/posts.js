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

// providers/a111477/posts.ts
var posts_exports = {};
__export(posts_exports, {
  getPosts: () => getPosts,
  getSearchPosts: () => getSearchPosts
});

var getPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    filter,
    page,
    signal,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = "https://a.111477.xyz";
    if (page > 1) {
      return [];
    }
    const url = `${baseUrl}${filter}`;
    const result = yield posts({ baseUrl, url, signal, axios, cheerio });
    return result.slice(0, 50);
  });
}, "getPosts");
var getSearchPosts = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    searchQuery,
    page,
    signal,
    providerContext
  }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = "https://a.111477.xyz";
    if (page > 1) {
      return [];
    }
    const moviesPosts = yield posts({
      baseUrl,
      url: `${baseUrl}/movies/`,
      signal,
      axios,
      cheerio
    });
    const tvsPosts = yield posts({
      baseUrl,
      url: `${baseUrl}/tvs/`,
      signal,
      axios,
      cheerio
    });
    const allPosts = [...moviesPosts, ...tvsPosts];
    const filteredPosts = allPosts.filter((post) => {
      const title = post.title.toLowerCase();
      const query = searchQuery.toLowerCase();
      if (title.includes(query)) {
        return true;
      }
      const queryWords = query.split(/\s+/).filter((word) => word.length > 0);
      const titleWords = title.split(/[\s\-\.\(\)\[\]]+/).filter((word) => word.length > 0);
      const allWordsMatch = queryWords.every(
        (queryWord) => titleWords.some((titleWord) => titleWord.includes(queryWord))
      );
      if (allWordsMatch) {
        return true;
      }
      if (queryWords.length === 1) {
        const queryWord = queryWords[0];
        if (queryWord.length >= 3) {
          const startsWithMatch = titleWords.some(
            (titleWord) => titleWord.startsWith(queryWord)
          );
          if (startsWithMatch) {
            return true;
          }
          const hasCloseMatch = titleWords.some((titleWord) => {
            if (Math.abs(titleWord.length - queryWord.length) > 2) return false;
            const distance = levenshteinDistance(titleWord, queryWord);
            return distance <= Math.max(1, Math.floor(queryWord.length * 0.2));
          });
          if (hasCloseMatch) {
            return true;
          }
        }
      }
      return false;
    });
    return filteredPosts;
  });
}, "getSearchPosts");
function posts(_0) {
  return __async(this, arguments, function* ({
    baseUrl,
    url,
    signal,
    axios,
    cheerio
  }) {
    try {
      const res = yield axios.get(url, { signal });
      const data = res.data;
      const $ = cheerio.load(data);
      const catalog = [];
      $("table tbody tr").each((i, element) => {
        const $row = $(element);
        const linkElement = $row.find("td:first-child a");
        const title = linkElement.text().trim();
        const link = linkElement.attr("href");
        if (title && link && title !== "../" && title !== "Parent Directory" && title.endsWith("/")) {
          const cleanTitle = title.replace(/\/$/, "");
          const fullLink = url + link;
          const imageTitle = cleanTitle.length > 30 ? cleanTitle.slice(0, 30).replace(/\./g, " ") : cleanTitle.replace(/\./g, " ");
          const image = `https://placehold.jp/23/000000/ffffff/200x400.png?text=${encodeURIComponent(
            imageTitle
          )}&css=%7B%22background%22%3A%22%20-webkit-gradient(linear%2C%20left%20bottom%2C%20left%20top%2C%20from(%233f3b3b)%2C%20to(%23000000))%22%2C%22text-transform%22%3A%22%20capitalize%22%7D`;
          catalog.push({
            title: cleanTitle,
            link: fullLink,
            image
          });
        }
      });
      return catalog;
    } catch (err) {
      console.error("111477 directory listing error:", err);
      return [];
    }
  });
}
__name(posts, "posts");
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        // deletion
        matrix[j - 1][i] + 1,
        // insertion
        matrix[j - 1][i - 1] + indicator
        // substitution
      );
    }
  }
  return matrix[str2.length][str1.length];
}
__name(levenshteinDistance, "levenshteinDistance");
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
// Annotate the CommonJS export names for ESM import in node:

