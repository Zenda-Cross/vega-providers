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
exports.getStream = void 0;
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: url, type, providerContext, }) {
        var _b, _c, _d, _e, _f, _g;
        const { axios, cheerio } = providerContext;
        try {
            console.log("pwGetStream", type, url);
            const baseUrl = url.split("/").slice(0, 3).join("/");
            const streamLinks = [];
            const urls = [];
            const res = yield axios.get(url);
            const data = res.data;
            const $ = cheerio.load(data);
            $('tr:contains("mixdrop")').map((i, element) => {
                const id = $(element).find(".wp-menu-btn").attr("data-wp-menu");
                const size = $(element).find(".wp-menu-btn").next().text();
                if (id) {
                    urls.push({ id: baseUrl + "/links/go/" + id, size });
                }
            });
            console.log("urls", urls);
            for (const url of urls) {
                const res2 = yield axios.head(url.id);
                const location = (_b = res2.request) === null || _b === void 0 ? void 0 : _b.responseURL.replace("/f/", "/e/");
                const res3 = yield fetch(location, {
                    credentials: "include",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
                        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Upgrade-Insecure-Requests": "1",
                        "Sec-Fetch-Dest": "iframe",
                        "Sec-Fetch-Mode": "navigate",
                        "Sec-Fetch-Site": "same-origin",
                        Pragma: "no-cache",
                        "Cache-Control": "no-cache",
                        referer: (_c = res2.request) === null || _c === void 0 ? void 0 : _c.responseURL,
                    },
                    referrer: (_d = res2.request) === null || _d === void 0 ? void 0 : _d.responseURL,
                    method: "GET",
                    mode: "cors",
                });
                const data3 = yield res3.text();
                // let MDCore: any = {};
                // Step 1: Extract the function parameters and the encoded string
                var functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
                var match = functionRegex.exec(data3);
                let p = "";
                if (match) {
                    // var params = match[1].split(',').map(param => param.trim());
                    var encodedString = match[2];
                    console.log("Encoded String:", encodedString);
                    // console.log('Parameters:', params);
                    // console.log('Encoded String:', encodedString.split("',36,")[0], '🔥🔥');
                    const base = Number(encodedString.split(",'|MDCore|")[0].split(",")[encodedString.split(",'|MDCore|")[0].split(",").length - 1]);
                    console.log("Base:", base);
                    p = (_e = encodedString.split(`',${base},`)) === null || _e === void 0 ? void 0 : _e[0].trim();
                    let a = base;
                    let c = encodedString.split(`',${base},`)[1].slice(2).split("|").length;
                    let k = encodedString.split(`',${base},`)[1].slice(2).split("|");
                    // console.log('p:', p);
                    // console.log('a:', a);
                    // console.log('c:', c);
                    // console.log('k:', k);
                    const decode = function (p, a, c, k, e, d) {
                        e = function (c) {
                            return c.toString(36);
                        };
                        if (!"".replace(/^/, String)) {
                            while (c--) {
                                d[c.toString(a)] = k[c] || c.toString(a);
                            }
                            k = [
                                function (e) {
                                    return d[e];
                                },
                            ];
                            e = function () {
                                return "\\w+";
                            };
                            c = 1;
                        }
                        while (c--) {
                            if (k[c]) {
                                p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
                            }
                        }
                        return p;
                    };
                    const decoded = decode(p, a, c, k, 0, {});
                    // get MDCore.wurl=
                    const wurl = (_f = decoded.match(/MDCore\.wurl="([^"]+)"/)) === null || _f === void 0 ? void 0 : _f[1];
                    console.log("wurl:", wurl);
                    const streamUrl = "https:" + wurl;
                    console.log("streamUrl:", streamUrl);
                    streamLinks.push({
                        server: "Mixdrop " + url.size,
                        link: streamUrl,
                        type: "mp4",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
                            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Upgrade-Insecure-Requests": "1",
                            "Sec-Fetch-Dest": "iframe",
                            "Sec-Fetch-Mode": "navigate",
                            "Sec-Fetch-Site": "same-origin",
                            Pragma: "no-cache",
                            "Cache-Control": "no-cache",
                            referer: (_g = res2.request) === null || _g === void 0 ? void 0 : _g.responseURL,
                        },
                    });
                }
                else {
                    console.log("No match found");
                }
            }
            return streamLinks;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getStream = getStream;
