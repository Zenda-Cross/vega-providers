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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdFlixExtracter = gdFlixExtracter;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const headers_1 = require("./headers");
async function gdFlixExtracter(link, signal) {
    try {
        const streamLinks = [];
        const res = await (0, axios_1.default)(`${link}`, { headers: headers_1.headers, signal });
        console.log('gdFlixExtracter', link);
        const data = res.data;
        let $drive = cheerio.load(data);
        // handle if redirected to another link
        if ($drive('body').attr('onload')?.includes('location.replace')) {
            const newLink = $drive('body')
                .attr('onload')
                ?.split("location.replace('")?.[1]
                .split("'")?.[0];
            console.log('newLink', newLink);
            if (newLink) {
                const newRes = await axios_1.default.get(newLink, { headers: headers_1.headers, signal });
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
                const resumeBotRes = await axios_1.default.get(resumeDrive, { headers: headers_1.headers });
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
                const resumeBotDownload = await fetch(resumeBotBaseUrl + '/download?id=' + resumeBotPath, {
                    method: 'POST',
                    body: resumeBotBody,
                    headers: {
                        Referer: resumeDrive,
                        Cookie: 'PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308',
                    },
                });
                const resumeBotDownloadData = await resumeBotDownload.json();
                console.log('resumeBotDownloadData', resumeBotDownloadData.url);
                streamLinks.push({
                    server: 'ResumeBot',
                    link: resumeBotDownloadData.url,
                    type: 'mkv',
                });
            }
            else {
                const url = baseUrl + resumeDrive;
                const resumeDriveRes = await axios_1.default.get(url, { headers: headers_1.headers });
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
                const newLinkRes = await axios_1.default.head(seed, { headers: headers_1.headers, signal });
                console.log('newLinkRes', newLinkRes.request?.responseURL);
                const newLink = newLinkRes.request?.responseURL?.split('?url=')?.[1] || seed;
                streamLinks.push({ server: 'G-Drive', link: newLink, type: 'mkv' });
            }
            else {
                const instantToken = seed.split('=')[1];
                //   console.log('InstantToken', instantToken);
                const InstantFromData = new FormData();
                InstantFromData.append('keys', instantToken);
                const videoSeedUrl = seed.split('/').slice(0, 3).join('/') + '/api';
                //   console.log('videoSeedUrl', videoSeedUrl);
                const instantLinkRes = await fetch(videoSeedUrl, {
                    method: 'POST',
                    body: InstantFromData,
                    headers: {
                        'x-token': videoSeedUrl,
                    },
                });
                const instantLinkData = await instantLinkRes.json();
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
}
