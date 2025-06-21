"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = getStream;
exports.getRedirectLinks = getRedirectLinks;
exports.decodeString = decodeString;
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, signal, providerContext, }) {
        var _b, _c, _d, _e;
        const { axios, cheerio, extractors, commonHeaders: headers, } = providerContext;
        const { hubcloudExtracter } = extractors;
        let hubdriveLink = "";
        if (link.includes("hubdrive")) {
            const hubdriveRes = yield axios.get(link, { headers, signal });
            const hubdriveText = hubdriveRes.data;
            const $ = cheerio.load(hubdriveText);
            hubdriveLink =
                $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
        }
        else {
            const res = yield axios.get(link, { headers, signal });
            const text = res.data;
            const encryptedString = (_d = (_c = (_b = text.split("s('o','")) === null || _b === void 0 ? void 0 : _b[1]) === null || _c === void 0 ? void 0 : _c.split("',180")) === null || _d === void 0 ? void 0 : _d[0];
            const decodedString = decodeString(encryptedString);
            link = atob(decodedString === null || decodedString === void 0 ? void 0 : decodedString.o);
            const redirectLink = yield getRedirectLinks(link, signal, headers);
            const redirectLinkRes = yield axios.get(redirectLink, { headers, signal });
            const redirectLinkText = redirectLinkRes.data;
            const $ = cheerio.load(redirectLinkText);
            hubdriveLink =
                $('h3:contains("1080p")').find("a").attr("href") ||
                    redirectLinkText.match(/href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/)[1];
            if (hubdriveLink.includes("hubdrive")) {
                const hubdriveRes = yield axios.get(hubdriveLink, { headers, signal });
                const hubdriveText = hubdriveRes.data;
                const $$ = cheerio.load(hubdriveText);
                hubdriveLink =
                    $$(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") ||
                        hubdriveLink;
            }
        }
        const hubdriveLinkRes = yield axios.get(hubdriveLink, { headers, signal });
        const hubcloudText = hubdriveLinkRes.data;
        const hubcloudLink = ((_e = hubcloudText.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i)) === null || _e === void 0 ? void 0 : _e[1]) || hubdriveLink;
        try {
            return yield hubcloudExtracter(hubcloudLink, signal);
        }
        catch (error) {
            console.log("hd hub 4 getStream error: ", error);
            return [];
        }
    });
}
const encode = function (value) {
    return btoa(value.toString());
};
const decode = function (value) {
    if (value === undefined) {
        return "";
    }
    return atob(value.toString());
};
const pen = function (value) {
    return value.replace(/[a-zA-Z]/g, function (_0x1a470e) {
        return String.fromCharCode((_0x1a470e <= "Z" ? 90 : 122) >=
            (_0x1a470e = _0x1a470e.charCodeAt(0) + 13)
            ? _0x1a470e
            : _0x1a470e - 26);
    });
};
const abortableTimeout = (ms, { signal } = {}) => {
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
};
function getRedirectLinks(link, signal, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch(link, { headers, signal });
            const resText = yield res.text();
            var regex = /ck\('_wp_http_\d+','([^']+)'/g;
            var combinedString = "";
            var match;
            while ((match = regex.exec(resText)) !== null) {
                // console.log(match[1]);
                combinedString += match[1];
            }
            // console.log(decode(combinedString));
            const decodedString = decode(pen(decode(decode(combinedString))));
            // console.log(decodedString);
            const data = JSON.parse(decodedString);
            console.log(data);
            const token = encode(data === null || data === void 0 ? void 0 : data.data);
            const blogLink = (data === null || data === void 0 ? void 0 : data.wp_http1) + "?re=" + token;
            // abort timeout on signal
            let wait = abortableTimeout((Number(data === null || data === void 0 ? void 0 : data.total_time) + 3) * 1000, {
                signal,
            });
            yield wait;
            console.log("blogLink", blogLink);
            let vcloudLink = "Invalid Request";
            while (vcloudLink.includes("Invalid Request")) {
                const blogRes = yield fetch(blogLink, { headers, signal });
                const blogResText = (yield blogRes.text());
                if (blogResText.includes("Invalid Request")) {
                    console.log(blogResText);
                }
                else {
                    vcloudLink = blogResText.match(/var reurl = "([^"]+)"/) || "";
                    break;
                }
            }
            // console.log('vcloudLink', vcloudLink?.[1]);
            return blogLink || link;
        }
        catch (err) {
            console.log("Error in getRedirectLinks", err);
            return link;
        }
    });
}
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (char) {
        const charCode = char.charCodeAt(0);
        const isUpperCase = char <= "Z";
        const baseCharCode = isUpperCase ? 65 : 97;
        return String.fromCharCode(((charCode - baseCharCode + 13) % 26) + baseCharCode);
    });
}
function decodeString(encryptedString) {
    try {
        // First base64 decode
        let decoded = atob(encryptedString);
        // Second base64 decode
        decoded = atob(decoded);
        // ROT13 decode
        decoded = rot13(decoded);
        // Third base64 decode
        decoded = atob(decoded);
        // Parse JSON
        return JSON.parse(decoded);
    }
    catch (error) {
        console.error("Error decoding string:", error);
        return null;
    }
}
