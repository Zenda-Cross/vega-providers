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

// providers/4khdhub/stream.ts
var stream_exports = {};
__export(stream_exports, {
  decodeString: () => decodeString,
  getRedirectLinks: () => getRedirectLinks,
  getStream: () => getStream
});


// providers/extractors/hubcloud.ts
var hubcloudDecode = /* @__PURE__ */ __name(function(value) {
  if (value === void 0) {
    return "";
  }
  return atob(value.toString());
}, "hubcloudDecode");
var extractUrlFromScript = /* @__PURE__ */ __name((html) => {
  var _a, _b, _c;
  const doubleAtobMatch = html.match(
    /var\s+url\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/
  );
  if (doubleAtobMatch == null ? void 0 : doubleAtobMatch[1]) {
    return atob(atob(doubleAtobMatch[1]));
  }
  const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
  return hubcloudDecode((_c = (_b = (_a = plainMatch == null ? void 0 : plainMatch[1]) == null ? void 0 : _a.split("r=")) == null ? void 0 : _b[1]) != null ? _c : "") || (plainMatch == null ? void 0 : plainMatch[1]) || "";
}, "extractUrlFromScript");
var getPixelDrainUrl = /* @__PURE__ */ __name((html) => {
  const match = html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i);
  return (match == null ? void 0 : match[1]) || "";
}, "getPixelDrainUrl");
var getRedirectedPixelDrainUrl = /* @__PURE__ */ __name((...htmlSources) => {
  for (const html of htmlSources) {
    if (!html) {
      continue;
    }
    const redirectedUrl = getPixelDrainUrl(html);
    if (redirectedUrl) {
      return redirectedUrl;
    }
  }
  return "";
}, "getRedirectedPixelDrainUrl");
function hubcloudExtractor(link, signal, axios, cheerio, headers) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    try {
      headers["Cookie"] = "ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg-1770053679-1.2.1.1-xBrQdciOJsweUF6F2T_OtH6jmyanN_TduQ0yslc_XqjU6RcHSxI7.YOKv6ry7oYo64868HYoULnVyww536H2eVI3R2e4wKzsky6abjPdfQPxqpUaXjxfJ02o6jl3_Vkwr4uiaU7Wy596Vdst3y78HXvVmKdIohhtPvp.vZ9_L7wvWdce0GRixjh_6JiqWmWMws46hwEt3hboaS1e1e4EoWCvj5b0M_jVwvSxBOAW5emFzvT3QrnRh4nyYmKDERnY";
      console.log("hubcloudExtractor", link);
      const baseUrl = link.split("/").slice(0, 3).join("/");
      const streamLinks = [];
      const vLinkRes = yield axios(`${link}`, { headers, signal });
      const vLinkText = vLinkRes.data;
      const $vLink = cheerio.load(vLinkText);
      let vcloudLink = extractUrlFromScript(vLinkText) || $vLink(".fa-file-download.fa-lg").parent().attr("href") || link;
      console.log("vcloudLink", vcloudLink);
      if (vcloudLink == null ? void 0 : vcloudLink.startsWith("/")) {
        vcloudLink = `${baseUrl}${vcloudLink}`;
        console.log("New vcloudLink", vcloudLink);
      }
      const vcloudRes = yield fetch(vcloudLink, {
        headers,
        signal,
        redirect: "follow"
      });
      const vcloudText = yield vcloudRes.text();
      const $ = cheerio.load(vcloudText);
      const linkClass = $(".btn-success.btn-lg.h6,.btn-danger,.btn-secondary");
      for (const element of linkClass) {
        const itm = $(element);
        let link2 = itm.attr("href") || "";
        switch (true) {
          case (link2 == null ? void 0 : link2.includes("pixeld")):
            console.log("Pixeldrain link found:", link2);
            if (!(link2 == null ? void 0 : link2.includes("api"))) {
              const redirectedPixelDrainUrl = getRedirectedPixelDrainUrl(
                vLinkText,
                vcloudText
              );
              if (redirectedPixelDrainUrl) {
                console.log(
                  "Special case for token negn6f",
                  redirectedPixelDrainUrl
                );
                link2 = redirectedPixelDrainUrl;
              }
              const token = (_a = link2.split("/").pop()) == null ? void 0 : _a.split("?")[0];
              const baseUrl2 = link2.split("/").slice(0, -2).join("/");
              link2 = `${baseUrl2}/api/file/${token}`;
            }
            streamLinks.push({ server: "Pixeldrain", link: link2, type: "mkv" });
            break;
          case ((link2 == null ? void 0 : link2.includes(".dev")) && !(link2 == null ? void 0 : link2.includes("/?id="))):
            streamLinks.push({ server: "Cf Worker", link: link2, type: "mkv" });
            break;
          case ((link2 == null ? void 0 : link2.includes("hubcloud")) || (link2 == null ? void 0 : link2.includes("/?id="))):
            try {
              const newLinkRes = yield fetch(link2, {
                method: "HEAD",
                headers,
                signal,
                redirect: "manual"
              });
              let newLink = link2;
              if (newLinkRes.status >= 300 && newLinkRes.status < 400) {
                newLink = newLinkRes.headers.get("location") || link2;
              } else if (newLinkRes.url && newLinkRes.url !== link2) {
                newLink = newLinkRes.url;
              } else {
                newLink = newLinkRes.headers.get("location") || link2;
              }
              if (newLink.includes("googleusercontent")) {
                newLink = newLink.split("?link=")[1];
              } else {
                const newLinkRes2 = yield fetch(newLink, {
                  method: "HEAD",
                  headers,
                  signal,
                  redirect: "manual"
                });
                if (newLinkRes2.status >= 300 && newLinkRes2.status < 400) {
                  newLink = ((_b = newLinkRes2.headers.get("location")) == null ? void 0 : _b.split("?link=")[1]) || newLink;
                } else if (newLinkRes2.url && newLinkRes2.url !== newLink) {
                  newLink = newLinkRes2.url.split("?link=")[1] || newLinkRes2.url;
                } else {
                  newLink = ((_c = newLinkRes2.headers.get("location")) == null ? void 0 : _c.split("?link=")[1]) || newLink;
                }
              }
              streamLinks.push({
                server: "hubcloud",
                link: newLink,
                type: "mkv"
              });
            } catch (error) {
              console.log("hubcloudExtractor error in hubcloud link: ", error);
            }
            break;
          case (link2 == null ? void 0 : link2.includes("cloudflarestorage")):
            streamLinks.push({ server: "CfStorage", link: link2, type: "mkv" });
            break;
          case ((link2 == null ? void 0 : link2.includes("fastdl")) || (link2 == null ? void 0 : link2.includes("fsl."))):
            streamLinks.push({ server: "FastDl", link: link2, type: "mkv" });
            break;
          case (link2.includes("hubcdn") && !link2.includes("/?id=")):
            streamLinks.push({
              server: "HubCdn",
              link: link2,
              type: "mkv"
            });
            break;
          default:
            if ((link2 == null ? void 0 : link2.includes(".mkv")) || (link2 == null ? void 0 : link2.includes("?token="))) {
              const serverName = ((_e = (_d = link2.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)) == null ? void 0 : _d[1]) == null ? void 0 : _e.replace(/\./g, " ")) || "Unknown";
              streamLinks.push({ server: serverName, link: link2, type: "mkv" });
            }
            break;
        }
      }
      console.log("streamLinks", streamLinks);
      return streamLinks;
    } catch (error) {
      console.log("hubcloudExtractor error: ", (error == null ? void 0 : error.message) || error);
      return [];
    }
  });
}
__name(hubcloudExtractor, "hubcloudExtractor");

// providers/4khdhub/stream.ts
function getStream(_0) {
  return __async(this, arguments, function* ({
    link,
    signal,
    providerContext
  }) {
    var _a, _b, _c, _d;
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    let hubdriveLink = "";
    if (link.includes("hubdrive")) {
      const hubdriveRes = yield axios.get(link, { headers, signal });
      const hubdriveText = hubdriveRes.data;
      const $ = cheerio.load(hubdriveText);
      hubdriveLink = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
    } else {
      const res = yield axios.get(link, { headers, signal });
      const text = res.data;
      const encryptedString = (_c = (_b = (_a = text.split("s('o','")) == null ? void 0 : _a[1]) == null ? void 0 : _b.split("',180")) == null ? void 0 : _c[0];
      const decodedString = decodeString(encryptedString) || link;
      console.log("decodedString", decodedString);
      link = safeAtob(decodedString == null ? void 0 : decodedString.o) || link;
      console.log("Decoded link", link);
      const redirectLink = yield getRedirectLinks(link, signal, headers);
      console.log("redirectLink", redirectLink);
      if (redirectLink.includes("hubcloud") || redirectLink.includes("/drive/")) {
        return yield hubcloudExtractor(
          redirectLink,
          signal,
          axios,
          cheerio,
          headers
        );
      }
      const redirectLinkRes = yield axios.get(redirectLink, { headers, signal });
      const redirectLinkText = redirectLinkRes.data;
      const $ = cheerio.load(redirectLinkText);
      hubdriveLink = $('h3:contains("1080p")').find("a").attr("href") || redirectLinkText.match(
        /href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/
      )[1];
      if (hubdriveLink.includes("hubdrive")) {
        const hubdriveRes = yield axios.get(hubdriveLink, { headers, signal });
        const hubdriveText = hubdriveRes.data;
        const $$ = cheerio.load(hubdriveText);
        hubdriveLink = $$(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || hubdriveLink;
      }
    }
    const hubdriveLinkRes = yield axios.get(hubdriveLink, { headers, signal });
    const hubcloudText = hubdriveLinkRes.data;
    const hubcloudLink = ((_d = hubcloudText.match(
      /<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i
    )) == null ? void 0 : _d[1]) || hubdriveLink;
    try {
      return yield hubcloudExtractor(
        hubcloudLink,
        signal,
        axios,
        cheerio,
        headers
      );
    } catch (error) {
      console.log("hd hub 4 getStream error: ", error);
      return [];
    }
  });
}
__name(getStream, "getStream");
var encode = /* @__PURE__ */ __name(function(value) {
  return btoa(value.toString());
}, "encode");
var decode = /* @__PURE__ */ __name(function(value) {
  if (value === void 0) {
    return "";
  }
  return atob(value.toString());
}, "decode");
var pen = /* @__PURE__ */ __name(function(value) {
  return value.replace(/[a-zA-Z]/g, function(_0x1a470e) {
    return String.fromCharCode(
      (_0x1a470e <= "Z" ? 90 : 122) >= (_0x1a470e = _0x1a470e.charCodeAt(0) + 13) ? _0x1a470e : _0x1a470e - 26
    );
  });
}, "pen");
var abortableTimeout = /* @__PURE__ */ __name((ms, { signal } = {}) => {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      return reject(new Error("Aborted"));
    }
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
      });
    }
  });
}, "abortableTimeout");
function getRedirectLinks(link, signal, headers) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(link, { headers, signal });
      const resText = yield res.text();
      var regex = /ck\('_wp_http_\d+','([^']+)'/g;
      var combinedString = "";
      var match;
      while ((match = regex.exec(resText)) !== null) {
        combinedString += match[1];
      }
      const decodedString = decode(pen(decode(decode(combinedString))));
      const data = JSON.parse(decodedString);
      console.log(data);
      const token = encode(data == null ? void 0 : data.data);
      const blogLink = (data == null ? void 0 : data.wp_http1) + "?re=" + token;
      let wait = abortableTimeout((Number(data == null ? void 0 : data.total_time) + 3) * 1e3, {
        signal
      });
      yield wait;
      console.log("blogLink", blogLink);
      let vcloudLink = "Invalid Request";
      while (vcloudLink.includes("Invalid Request")) {
        const blogRes = yield fetch(blogLink, { headers, signal });
        const blogResText = yield blogRes.text();
        if (blogResText.includes("Invalid Request")) {
          console.log(blogResText);
        } else {
          vcloudLink = blogResText.match(/var reurl = "([^"]+)"/) || "";
          break;
        }
      }
      return blogLink || link;
    } catch (err) {
      console.log("Error in getRedirectLinks", err);
      return link;
    }
  });
}
__name(getRedirectLinks, "getRedirectLinks");
function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function(char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= "Z";
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      (charCode - baseCharCode + 13) % 26 + baseCharCode
    );
  });
}
__name(rot13, "rot13");
var safeAtob = /* @__PURE__ */ __name((str) => {
  try {
    return atob(str);
  } catch (e) {
    return null;
  }
}, "safeAtob");
function decodeString(encryptedString) {
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error decoding string:", error);
    return null;
  }
}
__name(decodeString, "decodeString");
exports.decodeString = decodeString;
exports.getRedirectLinks = getRedirectLinks;
exports.getStream = getStream;
// Annotate the CommonJS export names for ESM import in node:

