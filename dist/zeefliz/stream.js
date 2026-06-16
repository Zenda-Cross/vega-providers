"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = getStream;
function decode(value) {
    if (value === undefined)
        return '';
    return atob(value.toString());
}
const headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Cache-Control': 'no-store',
    'Accept-Language': 'en-US,en;q=0.9',
    DNT: '1',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    Cookie: 'ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=6yZYfXQxBgjaD1eacR5zZCz7njssbxjtSZZCElTOGk0-1764836255-1.2.1.1-bzHvDcDRLp6AAYo7qvGVzJ6Gk6zaqAepuGiGhAWCGYL.ZDpw5yI4TkUIXDgAnEhGCZ9J5X2_OagzgeMHZrd8rzeyAFQXj0dmYMErcfII7_Rhq5kZ4kAtS0tl9PtaNKKd2m4taIufySXCCstl3iNLMODTjbsW_KZi8U8DauOdGSAhBd1DCGxvLlAOM.snfkhb0yQiVJcLW8Bv9IeKQac0ar_TKkV6QexqNZYiyRXnE7E; xla=s4t',
    'Upgrade-Insecure-Requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
};
async function hubcloudExtractor(link, signal, axiosInstance, cheerioModule, headers2) {
    var _a, _b, _c, _d, _e, _f;
    try {
        headers2.Cookie =
            'ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg-1770053679-1.2.1.1-xBrQdciOJsweUF6F2T_OtH6jmyanN_TduQ0yslc_XqjU6RcHSxI7.YOKv6ry7oYo64868HYoULnVyww536H2eVI3R2e4wKzsky6abjPdfQPxqpUaXjxfJ02o6jl3_Vkwr4uiaU7Wy596Vdst3y78HXvVmKdIohhtPvp.vZ9_L7wvWdce0GRixjh_6JiqWmWMws46hwEt3hboaS1e1e4EoWCvj5b0M_jVwvSxBOAW5emFzvT3QrnRh4nyYmKDERnY';
        console.log('hubcloudExtractor', link);
        console.log('headers', headers2);
        const baseUrl = link.split('/').slice(0, 3).join('/');
        const streamLinks = [];
        const vLinkText = (await axiosInstance.get(link, { headers: headers2, signal })).data;
        const $vLink = cheerioModule.load(vLinkText);
        const vLinkRedirect = vLinkText.match(/var\s+url\s*=\s*'([^']+)';/) || [];
        let vcloudLink = decode((_b = (_a = vLinkRedirect[1]) === null || _a === void 0 ? void 0 : _a.split('r=')) === null || _b === void 0 ? void 0 : _b[1]) ||
            vLinkRedirect[1] ||
            $vLink('.fa-file-download.fa-lg').parent().attr('href') ||
            link;
        console.log('vcloudLink', vcloudLink);
        if (vcloudLink === null || vcloudLink === void 0 ? void 0 : vcloudLink.startsWith('/')) {
            vcloudLink = `${baseUrl}${vcloudLink}`;
            console.log('New vcloudLink', vcloudLink);
        }
        const vcloudRes = await fetch(vcloudLink, {
            headers: headers2,
            signal,
            redirect: 'follow',
        });
        const $ = cheerioModule.load(await vcloudRes.text());
        const linkClass = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary, a.btn');
        const processedLinks = new Set();
        for (const element of linkClass) {
            const itm = $(element);
            let link2 = itm.attr('href') || '';
            if (!link2 ||
                processedLinks.has(link2) ||
                link2.toLowerCase().includes('telegram') ||
                link2.includes('t.me') ||
                link2.includes('one.one.one.one') ||
                link2.includes('tinyurl.com')) {
                continue;
            }
            processedLinks.add(link2);
            if (link2.includes('re.php?l=')) {
                try {
                    const b64 = link2.split('re.php?l=')[1].split('&')[0];
                    link2 = decode(b64);
                }
                catch (e) { }
            }
            const btnText = itm.text().trim();
            const serverNameMatch = btnText.match(/\[(.*?)\]/);
            const fallbackServerName = serverNameMatch
                ? serverNameMatch[1]
                : btnText.replace('Download', '').trim() || 'Download Server';
            switch (true) {
                case (link2 === null || link2 === void 0 ? void 0 : link2.includes('.dev')) && !(link2 === null || link2 === void 0 ? void 0 : link2.includes('/?id=')):
                    streamLinks.push({ server: 'Cf Worker', link: link2, type: 'mkv' });
                    break;
                case link2 === null || link2 === void 0 ? void 0 : link2.includes('pixeld'):
                    if (!(link2 === null || link2 === void 0 ? void 0 : link2.includes('api'))) {
                        const token = link2.split('/').pop();
                        const baseUrl2 = link2.split('/').slice(0, -2).join('/');
                        link2 = `${baseUrl2}/api/file/${token}?download`;
                    }
                    streamLinks.push({ server: 'Pixeldrain', link: link2, type: 'mkv' });
                    break;
                case (link2 === null || link2 === void 0 ? void 0 : link2.includes('hubcloud')) || (link2 === null || link2 === void 0 ? void 0 : link2.includes('/?id=')):
                    try {
                        const newLinkRes = await fetch(link2, {
                            method: 'HEAD',
                            headers: headers2,
                            signal,
                            redirect: 'manual',
                        });
                        let newLink = link2;
                        if (newLinkRes.status >= 300 && newLinkRes.status < 400) {
                            newLink = newLinkRes.headers.get('location') || link2;
                        }
                        else if (newLinkRes.url && newLinkRes.url !== link2) {
                            newLink = newLinkRes.url;
                        }
                        else {
                            newLink = newLinkRes.headers.get('location') || link2;
                        }
                        if (newLink.includes('googleusercontent')) {
                            newLink = newLink.split('?link=')[1];
                        }
                        else {
                            const newLinkRes2 = await fetch(newLink, {
                                method: 'HEAD',
                                headers: headers2,
                                signal,
                                redirect: 'manual',
                            });
                            if (newLinkRes2.status >= 300 && newLinkRes2.status < 400) {
                                newLink = ((_c = newLinkRes2.headers.get('location')) === null || _c === void 0 ? void 0 : _c.split('?link=')[1]) || newLink;
                            }
                            else if (newLinkRes2.url && newLinkRes2.url !== newLink) {
                                newLink =
                                    newLinkRes2.url.split('?link=')[1] || newLinkRes2.url;
                            }
                            else {
                                newLink =
                                    ((_d = newLinkRes2.headers.get('location')) === null || _d === void 0 ? void 0 : _d.split('?link=')[1]) || newLink;
                            }
                        }
                        streamLinks.push({ server: 'hubcloud', link: newLink, type: 'mkv' });
                    }
                    catch (error) {
                        console.log('hubcloudExtracter error in hubcloud link: ', error);
                    }
                    break;
                case link2 === null || link2 === void 0 ? void 0 : link2.includes('cloudflarestorage'):
                    streamLinks.push({ server: 'CfStorage', link: link2, type: 'mkv' });
                    break;
                case (link2 === null || link2 === void 0 ? void 0 : link2.includes('fastdl')) || (link2 === null || link2 === void 0 ? void 0 : link2.includes('fsl.')):
                    streamLinks.push({ server: 'FastDl', link: link2, type: 'mkv' });
                    break;
                case link2.includes('hubcdn') && !link2.includes('/?id='):
                    streamLinks.push({ server: 'HubCdn', link: link2, type: 'mkv' });
                    break;
                default:
                    if (link2 === null || link2 === void 0 ? void 0 : link2.includes('.mkv')) {
                        const serverName = ((_f = (_e = link2.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)) === null || _e === void 0 ? void 0 : _e[1]) === null || _f === void 0 ? void 0 : _f.replace(/\./g, ' ')) || 'Unknown';
                        streamLinks.push({ server: serverName, link: link2, type: 'mkv' });
                    }
                    else if (link2.startsWith('http')) {
                        streamLinks.push({
                            server: fallbackServerName,
                            link: link2,
                            type: 'mkv',
                        });
                    }
            }
        }
        console.log('streamLinks', streamLinks);
        return streamLinks;
    }
    catch (error) {
        console.log('hubcloudExtracter error: ', error);
        return [];
    }
}
async function getStream({ link, type, signal, providerContext, }) {
    var _a, _b, _c, _d;
    const { axios: axiosInstance, cheerio: cheerioModule, commonHeaders } = providerContext;
    try {
        const streamLinks = [];
        console.log('dotlink', link);
        if (type === 'movie') {
            const dotlinkText = (await axiosInstance.get(link, { headers })).data;
            link = (dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [])[1];
            try {
                const $ = cheerioModule.load(dotlinkText);
                const filepressLink = $('.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]')
                    .parent()
                    .attr('href');
                const filepressID = filepressLink === null || filepressLink === void 0 ? void 0 : filepressLink.split('/').pop();
                const filepressBaseUrl = filepressLink === null || filepressLink === void 0 ? void 0 : filepressLink.split('/').slice(0, -2).join('/');
                const filepressTokenRes = await axiosInstance.post(filepressBaseUrl + '/api/file/downlaod/', {
                    id: filepressID,
                    method: 'indexDownlaod',
                    captchaValue: null,
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        Referer: filepressBaseUrl,
                    },
                });
                if ((_a = filepressTokenRes.data) === null || _a === void 0 ? void 0 : _a.status) {
                    const filepressToken = filepressTokenRes.data.data;
                    const filepressStreamLink = await axiosInstance.post(filepressBaseUrl + '/api/file/downlaod2/', {
                        id: filepressToken,
                        method: 'indexDownlaod',
                        captchaValue: null,
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            Referer: filepressBaseUrl,
                        },
                    });
                    streamLinks.push({
                        server: 'filepress',
                        link: (_c = (_b = filepressStreamLink.data) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c[0],
                        type: 'mkv',
                    });
                }
            }
            catch (error) {
                console.log('filepress error: ');
            }
        }
        return await hubcloudExtractor(link, signal, axiosInstance, cheerioModule, commonHeaders);
    }
    catch (error) {
        console.log('getStream error: ', error);
        if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('Aborted'))
            return [];
        return [];
    }
}
