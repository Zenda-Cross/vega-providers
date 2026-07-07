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

// providers/showbox/episodes.ts
var episodes_exports = {};
__export(episodes_exports, {
  getEpisodes: () => getEpisodes
});

var getEpisodes = /* @__PURE__ */ __name(function(_0) {
  return __async(this, arguments, function* ({
    url: id,
    providerContext
  }) {
    const { axios } = providerContext;
    try {
      const [fileId, febboxId] = id.split("&");
      const febLink = febboxId ? `https://www.febbox.com/file/file_share_list?share_key=${fileId}&pwd=&parent_id=${febboxId}&is_html=0` : `https://www.febbox.com/file/file_share_list?share_key=${fileId}&pwd=&is_html=0`;
      const res = yield axios.get(febLink);
      const data = res.data;
      const fileList = data.data.file_list;
      const episodeLinks = [];
      fileList == null ? void 0 : fileList.map((file) => {
        const fileName = formatEpisodeName(file.file_name);
        const epId = file == null ? void 0 : file.fid;
        if (!file.is_dir && fileName && epId) {
          episodeLinks.push({
            title: fileName,
            link: `${fileId}&${epId}`
          });
        }
      });
      return episodeLinks;
    } catch (err) {
      return [];
    }
  });
}, "getEpisodes");
function formatEpisodeName(title) {
  const regex = /[sS](\d+)\s*[eE](\d+)/;
  const match = title.match(regex);
  if (match) {
    const season = match[1].padStart(2, "0");
    const episode = match[2].padStart(2, "0");
    return `Season${season} Episode${episode}`;
  } else {
    return title;
  }
}
__name(formatEpisodeName, "formatEpisodeName");
exports.getEpisodes = getEpisodes;
// Annotate the CommonJS export names for ESM import in node:

