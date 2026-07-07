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

// providers/genga/meta.ts
var meta_exports = {};
__export(meta_exports, {
  getMeta: () => getMeta
});

var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
function fetchAllEpisodes(animeId, axios) {
  return __async(this, null, function* () {
    const episodesList = [];
    let page = 1;
    let maxPage = 1;
    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.desidubanime.me/"
    };
    try {
      do {
        const url = `https://www.desidubanime.me/wp-admin/admin-ajax.php?action=get_episodes&anime_id=${animeId}&page=${page}&order=asc`;
        const res = yield axios.get(url, { headers });
        const data = res.data;
        if (data && data.success && data.data) {
          const episodes = data.data.episodes || [];
          episodes.forEach((ep) => {
            const numberStr = ep.number || "";
            const titleStr = ep.title || "";
            const displayTitle = numberStr && titleStr ? `${numberStr} - ${titleStr}` : numberStr || titleStr || "Episode";
            episodesList.push({
              title: displayTitle.trim(),
              link: `${ep.url}*episode`,
              type: "series"
            });
          });
          maxPage = data.data.max_episodes_page || 1;
          page++;
        } else {
          break;
        }
      } while (page <= maxPage);
    } catch (err) {
      console.error(`Error fetching episodes for animeId ${animeId}:`, err);
    }
    return episodesList;
  });
}
__name(fetchAllEpisodes, "fetchAllEpisodes");
var getMeta = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    link,
    providerContext
  }) {
    try {
      const { axios, cheerio } = providerContext;
      const headers = { "User-Agent": USER_AGENT };
      const watchRes = yield axios.get(link, { headers });
      const watchHtml = watchRes.data || "";
      const $watch = cheerio.load(watchHtml);
      let detailsUrl = $watch('a[href*="/anime/"]').first().attr("href") || "";
      if (!detailsUrl) {
        detailsUrl = link;
      }
      const detailsRes = yield axios.get(detailsUrl, { headers });
      const html = detailsRes.data || "";
      const $ = cheerio.load(html);
      const title = $("h1 span.anime").first().text().trim() || $("h1").text().trim() || "Anime Details";
      const synopsis = $("div[data-synopsis] p").text().trim() || $("div.prose p").text().trim() || "";
      let image = $('img[src*="cdn.myanimelist.net/images/anime"]').first().attr("src") || "";
      if (!image) {
        image = $("img.anime-main-image").first().attr("src") || "";
      }
      if (!image) {
        image = $("img.object-cover").first().attr("src") || "";
      }
      let postId = $("input#comment_post_ID").val() || "";
      if (!postId) {
        const match = html.match(/"postId"\s*:\s*"(\d+)"/);
        if (match) postId = match[1];
      }
      const seasons = [];
      $("#seasonButtonsContainer button").each((_, el) => {
        const seasonId = $(el).attr("data-season") || "";
        const seasonTitle = $(el).text().trim() || "Season";
        if (seasonId) {
          seasons.push({ id: seasonId, title: seasonTitle });
        }
      });
      if (seasons.length === 0 && postId) {
        seasons.push({ id: String(postId), title: "Season 1" });
      }
      const linkList = yield Promise.all(
        seasons.map((s) => __async(null, null, function* () {
          const episodes = yield fetchAllEpisodes(s.id, axios);
          return {
            title: s.title,
            directLinks: episodes
          };
        }))
      );
      return {
        title,
        synopsis,
        image,
        imdbId: "",
        type: "series",
        linkList
      };
    } catch (err) {
      console.error("DesiDubAnime getMeta error:", err);
      return {
        title: "Anime Details",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "series",
        linkList: []
      };
    }
  });
}, "getMeta");
exports.getMeta = getMeta;
// Annotate the CommonJS export names for ESM import in node:

