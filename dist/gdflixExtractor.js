"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdFlixExtracter = gdFlixExtracter;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const headers_1 = require("./headers");
function gdFlixExtracter(link, signal) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const streamLinks = [];
            const res = yield (0, axios_1.default)(`${link}`, { headers: headers_1.headers, signal });
            console.log('gdFlixExtracter', link);
            const data = res.data;
            let $drive = cheerio.load(data);
            // handle if redirected to another link
            if ((_a = $drive('body').attr('onload')) === null || _a === void 0 ? void 0 : _a.includes('location.replace')) {
                const newLink = (_d = (_c = (_b = $drive('body')
                    .attr('onload')) === null || _b === void 0 ? void 0 : _b.split("location.replace('")) === null || _c === void 0 ? void 0 : _c[1].split("'")) === null || _d === void 0 ? void 0 : _d[0];
                console.log('newLink', newLink);
                if (newLink) {
                    const newRes = yield axios_1.default.get(newLink, { headers: headers_1.headers, signal });
                    $drive = cheerio.load(newRes.data);
                }
            }
            // try {
            //   const resumeBot = $drive('.fab.fa-artstation').prev().attr('href') || '';
            //   console.log('resumeBot', resumeBot);
            //   const resumeBotRes = await axios.get(resumeBot, {headers});
            //   const resumeBotToken = resumeBotRes.data.match(
            //     /formData\.append\('token', '([a-f0-9]+)'\)/,
            //   )[1];
            //   const resumeBotBody = new FormData();
            //   resumeBotBody.append('token', resumeBotToken);
            //   const resumeBotPath = resumeBotRes.data.match(
            //     /fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/,
            //   )[1];
            //   const resumeBotBaseUrl = resumeBot.split('/download')[0];
            //   // console.log(
            //   //   'resumeBotPath',
            //   //   resumeBotBaseUrl + '/download?id=' + resumeBotPath,
            //   // );
            //   // console.log('resumeBotBody', resumeBotToken);
            //   const resumeBotDownload = await fetch(
            //     resumeBotBaseUrl + '/download?id=' + resumeBotPath,
            //     {
            //       method: 'POST',
            //       body: resumeBotBody,
            //       headers: {
            //         Referer: resumeBot,
            //         Cookie: 'PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308',
            //       },
            //     },
            //   );
            //   const resumeBotDownloadData = await resumeBotDownload.json();
            //   console.log('resumeBotDownloadData', resumeBotDownloadData.url);
            //   streamLinks.push({
            //     server: 'ResumeBot',
            //     link: resumeBotDownloadData.url,
            //     type: 'mkv',
            //   });
            // } catch (err) {
            //   console.log('ResumeBot link not found', err);
            // }
            /// resume cloud
            try {
                const baseUrl = link.split('/').slice(0, 3).join('/');
                const resumeDrive = $drive('.btn-secondary').attr('href') || '';
                console.log('resumeDrive', resumeDrive);
                if (resumeDrive.includes('indexbot')) {
                    const resumeBotRes = yield axios_1.default.get(resumeDrive, { headers: headers_1.headers });
                    const resumeBotToken = resumeBotRes.data.match(/formData\.append\('token', '([a-f0-9]+)'\)/)[1];
                    const resumeBotBody = new FormData();
                    resumeBotBody.append('token', resumeBotToken);
                    const resumeBotPath = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/)[1];
                    const resumeBotBaseUrl = resumeDrive.split('/download')[0];
                    // console.log(
                    //   'resumeBotPath',
                    //   resumeBotBaseUrl + '/download?id=' + resumeBotPath,
                    // );
                    // console.log('resumeBotBody', resumeBotToken);
                    const resumeBotDownload = yield fetch(resumeBotBaseUrl + '/download?id=' + resumeBotPath, {
                        method: 'POST',
                        body: resumeBotBody,
                        headers: {
                            Referer: resumeDrive,
                            Cookie: 'PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308',
                        },
                    });
                    const resumeBotDownloadData = yield resumeBotDownload.json();
                    console.log('resumeBotDownloadData', resumeBotDownloadData.url);
                    streamLinks.push({
                        server: 'ResumeBot',
                        link: resumeBotDownloadData.url,
                        type: 'mkv',
                    });
                }
                else {
                    const url = baseUrl + resumeDrive;
                    const resumeDriveRes = yield axios_1.default.get(url, { headers: headers_1.headers });
                    const resumeDriveHtml = resumeDriveRes.data;
                    const $resumeDrive = cheerio.load(resumeDriveHtml);
                    const resumeLink = $resumeDrive('.btn-success').attr('href');
                    //   console.log('resumeLink', resumeLink);
                    if (resumeLink) {
                        streamLinks.push({
                            server: 'ResumeCloud',
                            link: resumeLink,
                            type: 'mkv',
                        });
                    }
                }
            }
            catch (err) {
                console.log('Resume link not found');
            }
            //instant link
            try {
                const seed = $drive('.btn-danger').attr('href') || '';
                console.log('seed', seed);
                if (!seed.includes('?url=')) {
                    const newLinkRes = yield axios_1.default.head(seed, { headers: headers_1.headers, signal });
                    console.log('newLinkRes', (_e = newLinkRes.request) === null || _e === void 0 ? void 0 : _e.responseURL);
                    const newLink = ((_h = (_g = (_f = newLinkRes.request) === null || _f === void 0 ? void 0 : _f.responseURL) === null || _g === void 0 ? void 0 : _g.split('?url=')) === null || _h === void 0 ? void 0 : _h[1]) || seed;
                    streamLinks.push({ server: 'G-Drive', link: newLink, type: 'mkv' });
                }
                else {
                    const instantToken = seed.split('=')[1];
                    //   console.log('InstantToken', instantToken);
                    const InstantFromData = new FormData();
                    InstantFromData.append('keys', instantToken);
                    const videoSeedUrl = seed.split('/').slice(0, 3).join('/') + '/api';
                    //   console.log('videoSeedUrl', videoSeedUrl);
                    const instantLinkRes = yield fetch(videoSeedUrl, {
                        method: 'POST',
                        body: InstantFromData,
                        headers: {
                            'x-token': videoSeedUrl,
                        },
                    });
                    const instantLinkData = yield instantLinkRes.json();
                    //   console.log('instantLinkData', instantLinkData);
                    if (instantLinkData.error === false) {
                        const instantLink = instantLinkData.url;
                        streamLinks.push({
                            server: 'Gdrive-Instant',
                            link: instantLink,
                            type: 'mkv',
                        });
                    }
                    else {
                        console.log('Instant link not found', instantLinkData);
                    }
                }
            }
            catch (err) {
                console.log('Instant link not found', err);
            }
            return streamLinks;
        }
        catch (error) {
            console.log('gdflix error: ', error);
            return [];
        }
    });
}
