"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = void 0;
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};
const getStream = ({ link: url, providerContext, }) => {
    const { axios, cheerio } = providerContext;
    return modExtractor(url, providerContext)
        .then((downloadLink) => {
        var _a, _b;
        const ddl = ((_b = (_a = downloadLink === null || downloadLink === void 0 ? void 0 : downloadLink.data) === null || _a === void 0 ? void 0 : _a.match(/content="0;url=(.*?)"/)) === null || _b === void 0 ? void 0 : _b[1]) || url;
        console.log("ddl", ddl);
        return isDriveLink(ddl).then((driveLink) => {
            const ServerLinks = [];
            return axios
                .get(driveLink, { headers })
                .then((driveRes) => {
                const driveHtml = driveRes.data;
                const $drive = cheerio.load(driveHtml);
                const promises = [];
                // instant link
                const instantPromise = (() => {
                    try {
                        const seed = $drive(".btn-danger").attr("href") || "";
                        const instantToken = seed.split("=")[1];
                        const InstantFromData = new FormData();
                        InstantFromData.append("keys", instantToken);
                        const videoSeedUrl = seed.split("/").slice(0, 3).join("/") + "/api";
                        return fetch(videoSeedUrl, {
                            method: "POST",
                            body: InstantFromData,
                            headers: {
                                "x-token": videoSeedUrl,
                            },
                        })
                            .then((res) => res.json())
                            .then((instantLinkData) => {
                            if (instantLinkData.error === false) {
                                ServerLinks.push({
                                    server: "Gdrive-Instant",
                                    link: instantLinkData.url,
                                    type: "mkv",
                                });
                            }
                            else {
                                console.log("Instant link not found", instantLinkData);
                            }
                        })
                            .catch((err) => {
                            console.log("Instant link not found", err);
                        });
                    }
                    catch (err) {
                        console.log("Instant link not found", err);
                        return Promise.resolve();
                    }
                })();
                promises.push(instantPromise);
                // resume link
                const resumePromise = (() => {
                    try {
                        const resumeDrive = driveLink.replace("/file", "/zfile");
                        return axios
                            .get(resumeDrive, { headers })
                            .then((resumeDriveRes) => {
                            const $resumeDrive = cheerio.load(resumeDriveRes.data);
                            const resumeLink = $resumeDrive(".btn-success").attr("href");
                            if (resumeLink) {
                                ServerLinks.push({
                                    server: "ResumeCloud",
                                    link: resumeLink,
                                    type: "mkv",
                                });
                            }
                        })
                            .catch(() => {
                            console.log("Resume link not found");
                        });
                    }
                    catch (err) {
                        console.log("Resume link not found");
                        return Promise.resolve();
                    }
                })();
                promises.push(resumePromise);
                // CF workers type 1
                const cf1Promise = (() => {
                    try {
                        const cfWorkersLink = driveLink.replace("/file", "/wfile") + "?type=1";
                        return axios
                            .get(cfWorkersLink, { headers })
                            .then((cfWorkersRes) => {
                            const $cfWorkers = cheerio.load(cfWorkersRes.data);
                            $cfWorkers(".btn-success").each((i, el) => {
                                var _a;
                                const link = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a.href;
                                if (link) {
                                    ServerLinks.push({
                                        server: "Cf Worker 1." + i,
                                        link: link,
                                        type: "mkv",
                                    });
                                }
                            });
                        })
                            .catch((err) => {
                            console.log("CF workers link not found", err);
                        });
                    }
                    catch (err) {
                        console.log("CF workers link not found", err);
                        return Promise.resolve();
                    }
                })();
                promises.push(cf1Promise);
                // CF workers type 2
                const cf2Promise = (() => {
                    try {
                        const cfWorkersLink = driveLink.replace("/file", "/wfile") + "?type=2";
                        return axios
                            .get(cfWorkersLink, { headers })
                            .then((cfWorkersRes) => {
                            const $cfWorkers = cheerio.load(cfWorkersRes.data);
                            $cfWorkers(".btn-success").each((i, el) => {
                                var _a;
                                const link = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a.href;
                                if (link) {
                                    ServerLinks.push({
                                        server: "Cf Worker 2." + i,
                                        link: link,
                                        type: "mkv",
                                    });
                                }
                            });
                        })
                            .catch((err) => {
                            console.log("CF workers link not found", err);
                        });
                    }
                    catch (err) {
                        console.log("CF workers link not found", err);
                        return Promise.resolve();
                    }
                })();
                promises.push(cf2Promise);
                return Promise.all(promises).then(() => {
                    console.log("ServerLinks", ServerLinks);
                    return ServerLinks;
                });
            })
                .catch((err) => {
                console.log("getStream inner error", err);
                return [];
            });
        });
    })
        .catch((err) => {
        console.log("getStream error", err);
        return [];
    });
};
exports.getStream = getStream;
const isDriveLink = (ddl) => {
    if (!ddl.includes("drive")) {
        return Promise.resolve(ddl);
    }
    return fetch(ddl)
        .then((driveLeach) => driveLeach.text())
        .then((driveLeachData) => {
        const pathMatch = driveLeachData.match(/window\.location\.replace\("([^"]+)"\)/);
        const path = pathMatch === null || pathMatch === void 0 ? void 0 : pathMatch[1];
        const mainUrl = ddl.split("/")[2];
        console.log(`driveUrl = https://${mainUrl}${path}`);
        return `https://${mainUrl}${path}`;
    })
        .catch(() => ddl);
};
function modExtractor(url, providerContext) {
    const { axios, cheerio } = providerContext;
    const wpHttp = url.split("sid=")[1];
    const bodyFormData0 = new FormData();
    bodyFormData0.append("_wp_http", wpHttp);
    let context = {};
    return fetch(url.split("?")[0], {
        method: "POST",
        body: bodyFormData0,
    })
        .then((res) => res.text())
        .then((data) => {
        const $ = cheerio.load(data);
        const wpHttp2 = $("input").attr("name", "_wp_http2").val();
        context.wpHttp2 = wpHttp2;
        const formUrl1 = $("form").attr("action");
        context.formUrl = formUrl1 || url.split("?")[0];
        const bodyFormData = new FormData();
        bodyFormData.append("_wp_http2", wpHttp2);
        return fetch(context.formUrl, {
            method: "POST",
            body: bodyFormData,
        });
    })
        .then((res2) => res2.text())
        .then((html2) => {
        const match = html2.match(/setAttribute\("href",\s*"(.*?)"/);
        if (!match || !match[1]) {
            console.log("Link extraction failed");
            return undefined;
        }
        const link = match[1];
        console.log(link);
        const cookie = link.split("=")[1];
        console.log("cookie", cookie);
        return axios.get(link, {
            headers: {
                Referer: context.formUrl,
                Cookie: `${cookie}=${context.wpHttp2}`,
            },
        });
    })
        .catch((err) => {
        console.log("modGetStream error", err);
        return undefined;
    });
}
