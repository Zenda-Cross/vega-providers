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
    Cookie: "popads_user_id=6ba8fe60a481387a3249f05aa058822d",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: url, type, providerContext, }) {
        var _b, _c;
        const { axios, cheerio } = providerContext;
        try {
            const modGetEpisodeLinks = function (_a) {
                return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
                    var _b;
                    const { axios, cheerio } = providerContext;
                    try {
                        if (url.includes("url=")) {
                            url = atob(url.split("url=")[1]);
                        }
                        const res = yield axios.get(url);
                        const html = res.data;
                        let $ = cheerio.load(html);
                        if (url.includes("url=")) {
                            const newUrl = (_b = $("meta[http-equiv='refresh']")
                                .attr("content")) === null || _b === void 0 ? void 0 : _b.split("url=")[1];
                            const res2 = yield axios.get(newUrl || url);
                            const html2 = res2.data;
                            $ = cheerio.load(html2);
                        }
                        const episodeLinks = [];
                        $("h3,h4").map((i, element) => {
                            const seriesTitle = $(element).text();
                            const episodesLink = $(element).find("a").attr("href");
                            if (episodesLink && episodesLink !== "#") {
                                episodeLinks.push({
                                    title: seriesTitle.trim() || "No title found",
                                    link: episodesLink || "",
                                });
                            }
                        });
                        $("a.maxbutton").map((i, element) => {
                            const seriesTitle = $(element).children("span").text();
                            const episodesLink = $(element).attr("href");
                            if (episodesLink && episodesLink !== "#") {
                                episodeLinks.push({
                                    title: seriesTitle.trim() || "No title found",
                                    link: episodesLink || "",
                                });
                            }
                        });
                        return episodeLinks;
                    }
                    catch (err) {
                        console.error(err);
                        return [];
                    }
                });
            };
            console.log("modGetStream", type, url);
            if (type === "movie") {
                const servers = yield modGetEpisodeLinks({ url, providerContext });
                url = servers[0].link || url;
            }
            let downloadLink = yield modExtractor(url, providerContext);
            // console.log(downloadLink.data);
            const ddl = ((_c = (_b = downloadLink === null || downloadLink === void 0 ? void 0 : downloadLink.data) === null || _b === void 0 ? void 0 : _b.match(/content="0;url=(.*?)"/)) === null || _c === void 0 ? void 0 : _c[1]) || url;
            // console.log('ddl', url);
            // console.log(ddl);
            // console.log(ddl);
            const servers = [];
            const driveLink = yield isDriveLink(ddl);
            const driveRes = yield axios.get(driveLink, { headers });
            const driveHtml = driveRes.data;
            const $drive = cheerio.load(driveHtml);
            try {
                const resumeBot = $drive(".btn.btn-light").attr("href") || "";
                const resumeBotRes = yield axios.get(resumeBot, { headers });
                const resumeBotToken = resumeBotRes.data.match(/formData\.append\('token', '([a-f0-9]+)'\)/)[1];
                const resumeBotBody = new FormData();
                resumeBotBody.append("token", resumeBotToken);
                const resumeBotPath = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/)[1];
                const resumeBotBaseUrl = resumeBot.split("/download")[0];
                // console.log(
                //   'resumeBotPath',
                //   resumeBotBaseUrl + '/download?id=' + resumeBotPath,
                // );
                // console.log('resumeBotBody', resumeBotToken);
                const resumeBotDownload = yield fetch(resumeBotBaseUrl + "/download?id=" + resumeBotPath, {
                    method: "POST",
                    body: resumeBotBody,
                    headers: {
                        Referer: resumeBot,
                        Cookie: "PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308",
                    },
                });
                const resumeBotDownloadData = yield resumeBotDownload.json();
                console.log("resumeBotDownloadData", resumeBotDownloadData.url);
                servers.push({
                    server: "ResumeBot",
                    link: resumeBotDownloadData.url,
                    type: "mkv",
                });
            }
            catch (err) {
                console.log("ResumeBot link not found", err);
            }
            // CF workers type 1
            try {
                const cfWorkersLink = driveLink.replace("/file", "/wfile") + "?type=1";
                const cfWorkersRes = yield axios.get(cfWorkersLink, { headers });
                const cfWorkersHtml = cfWorkersRes.data;
                const $cfWorkers = cheerio.load(cfWorkersHtml);
                const cfWorkersStream = $cfWorkers(".btn-success");
                cfWorkersStream.each((i, el) => {
                    var _a;
                    const link = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a.href;
                    if (link) {
                        servers.push({
                            server: "Cf Worker 1." + i,
                            link: link,
                            type: "mkv",
                        });
                    }
                });
            }
            catch (err) {
                console.log("CF workers link not found", err);
            }
            // CF workers type 2
            try {
                const cfWorkersLink = driveLink.replace("/file", "/wfile") + "?type=2";
                const cfWorkersRes = yield axios.get(cfWorkersLink, { headers });
                const cfWorkersHtml = cfWorkersRes.data;
                const $cfWorkers = cheerio.load(cfWorkersHtml);
                const cfWorkersStream = $cfWorkers(".btn-success");
                cfWorkersStream.each((i, el) => {
                    var _a;
                    const link = (_a = el.attribs) === null || _a === void 0 ? void 0 : _a.href;
                    if (link) {
                        servers.push({
                            server: "Cf Worker 2." + i,
                            link: link,
                            type: "mkv",
                        });
                    }
                });
            }
            catch (err) {
                console.log("CF workers link not found", err);
            }
            // gdrive
            //instant link
            try {
                const seed = $drive(".btn-danger").attr("href") || "";
                const instantToken = seed.split("=")[1];
                //   console.log('InstantToken', instantToken);
                const InstantFromData = new FormData();
                InstantFromData.append("keys", instantToken);
                const videoSeedUrl = seed.split("/").slice(0, 3).join("/") + "/api";
                //   console.log('videoSeedUrl', videoSeedUrl);
                const instantLinkRes = yield fetch(videoSeedUrl, {
                    method: "POST",
                    body: InstantFromData,
                    headers: {
                        "x-token": videoSeedUrl,
                    },
                });
                const instantLinkData = yield instantLinkRes.json();
                //   console.log('instantLinkData', instantLinkData);
                if (instantLinkData.error === false) {
                    const instantLink = instantLinkData.url;
                    servers.push({
                        server: "Gdrive-Instant",
                        link: instantLink,
                        type: "mkv",
                    });
                }
                else {
                    console.log("Instant link not found", instantLinkData);
                }
            }
            catch (err) {
                console.log("Instant link not found", err);
            }
            return servers;
        }
        catch (err) {
            console.log("getStream error", err);
            return [];
        }
    });
};
exports.getStream = getStream;
const isDriveLink = (ddl) => __awaiter(void 0, void 0, void 0, function* () {
    if (ddl.includes("drive")) {
        const driveLeach = yield fetch(ddl);
        const driveLeachData = yield driveLeach.text();
        const pathMatch = driveLeachData.match(/window\.location\.replace\("([^"]+)"\)/);
        const path = pathMatch === null || pathMatch === void 0 ? void 0 : pathMatch[1];
        const mainUrl = ddl.split("/")[2];
        console.log(`driveUrl = https://${mainUrl}${path}`);
        return `https://${mainUrl}${path}`;
    }
    else {
        return ddl;
    }
});
function modExtractor(url, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const { axios, cheerio } = providerContext;
        try {
            const wpHttp = url.split("sid=")[1];
            var bodyFormData0 = new FormData();
            bodyFormData0.append("_wp_http", wpHttp);
            const res = yield fetch(url.split("?")[0], {
                method: "POST",
                body: bodyFormData0,
            });
            const data = yield res.text();
            // console.log('', data);
            const html = data;
            const $ = cheerio.load(html);
            // find input with name="_wp_http2"
            const wpHttp2 = $("input").attr("name", "_wp_http2").val();
            // console.log('wpHttp2', wpHttp2);
            // form data
            var bodyFormData = new FormData();
            bodyFormData.append("_wp_http2", wpHttp2);
            const formUrl1 = $("form").attr("action");
            const formUrl = formUrl1 || url.split("?")[0];
            const res2 = yield fetch(formUrl, {
                method: "POST",
                body: bodyFormData,
            });
            const html2 = yield res2.text();
            const link = html2.match(/setAttribute\("href",\s*"(.*?)"/)[1];
            console.log(link);
            const cookie = link.split("=")[1];
            console.log("cookie", cookie);
            const downloadLink = yield axios.get(link, {
                headers: {
                    Referer: formUrl,
                    Cookie: `${cookie}=${wpHttp2}`,
                },
            });
            return downloadLink;
        }
        catch (err) {
            console.log("modGetStream error", err);
        }
    });
}
