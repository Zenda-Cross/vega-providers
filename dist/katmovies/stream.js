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
function extractKmhdLink(katlink, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const { axios } = providerContext;
        const res = yield axios.get(katlink);
        const data = res.data;
        const hubDriveRes = data.match(/hubdrive_res:\s*"([^"]+)"/)[1];
        const hubDriveLink = data.match(/hubdrive_res\s*:\s*{[^}]*?link\s*:\s*"([^"]+)"/)[1];
        return hubDriveLink + hubDriveRes;
    });
}
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, signal, providerContext, }) {
        const { axios, cheerio, extractors } = providerContext;
        const { hubcloudExtracter, gdFlixExtracter } = extractors;
        const streamLinks = [];
        console.log("katGetStream", link);
        try {
            if (link.includes("gdflix")) {
                return yield gdFlixExtracter(link, signal);
            }
            if (link.includes("kmhd")) {
                const hubcloudLink = yield extractKmhdLink(link, providerContext);
                return yield hubcloudExtracter(hubcloudLink, signal);
            }
            if (link.includes("gdflix")) {
                // resume link
                try {
                    const resumeDrive = link.replace("/file", "/zfile");
                    //   console.log('resumeDrive', resumeDrive);
                    const resumeDriveRes = yield axios.get(resumeDrive);
                    const resumeDriveHtml = resumeDriveRes.data;
                    const $resumeDrive = cheerio.load(resumeDriveHtml);
                    const resumeLink = $resumeDrive(".btn-success").attr("href");
                    console.log("resumeLink", resumeLink);
                    if (resumeLink) {
                        streamLinks.push({
                            server: "ResumeCloud",
                            link: resumeLink,
                            type: "mkv",
                        });
                    }
                }
                catch (err) {
                    console.log("Resume link not found");
                }
                //instant link
                try {
                    const driveres = yield axios.get(link, { timeout: 10000 });
                    const $drive = cheerio.load(driveres.data);
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
                    console.log("instantLinkData", instantLinkData);
                    if (instantLinkData.error === false) {
                        const instantLink = instantLinkData.url;
                        streamLinks.push({
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
                return streamLinks;
            }
            const stereams = yield hubcloudExtracter(link, signal);
            return stereams;
        }
        catch (error) {
            console.log("katgetStream error: ", error);
            return [];
        }
    });
};
exports.getStream = getStream;
