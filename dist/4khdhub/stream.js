"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeString = decodeString;
exports.getRedirectLinks = getRedirectLinks;
exports.getStream = getStream;
// Base64 decode (atob)
function decode(value) {
    if (value === undefined)
        return '';
    return atob(value.toString());
}
// Base64 encode (btoa)
function encode(value) {
    return btoa(value.toString());
}
// Duplicate decode for internal use (same as decode)
function decode2(value) {
    if (value === undefined)
        return '';
    return atob(value.toString());
}
// ROT13 cipher (used inside getRedirectLinks)
function pen(value) {
    return value.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        const upperLimit = char <= 'Z' ? 90 : 122;
        return String.fromCharCode((upperLimit >= (code + 13) ? code + 13 : code - 26));
    });
}
// ROT13 cipher (used inside decodeString)
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, (char) => {
        const charCode = char.charCodeAt(0);
        const baseCharCode = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(((charCode - baseCharCode + 13) % 26) + baseCharCode);
    });
}
// Decode an encrypted string using multiple layers of base64 and rot13
function decodeString(encryptedString) {
    try {
        let decoded = atob(encryptedString);
        decoded = atob(decoded);
        decoded = rot13(decoded);
        decoded = atob(decoded);
        return JSON.parse(decoded);
    }
    catch (error) {
        console.error('Error decoding string:', error);
        return null;
    }
}
// Promise that resolves after ms or rejects if aborted
function abortableTimeout(ms, { signal } = {}) {
    return new Promise((resolve, reject) => {
        if (signal === null || signal === void 0 ? void 0 : signal.aborted)
            return reject(new Error('Aborted'));
        const timer = setTimeout(resolve, ms);
        signal === null || signal === void 0 ? void 0 : signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
        });
    });
}
// Extract the final redirect link from the "ck" protected page
async function getRedirectLinks(link, signal, headers) {
    try {
        const res = await fetch(link, { headers, signal });
        const resText = await res.text();
        const regex = /ck\('_wp_http_\d+','([^']+)'/g;
        let match;
        let combinedString = '';
        while ((match = regex.exec(resText)) !== null) {
            combinedString += match[1];
        }
        const decodedString = decode2(pen(decode2(decode2(combinedString))));
        const data = JSON.parse(decodedString);
        console.log(data);
        const token = encode(data === null || data === void 0 ? void 0 : data.data);
        const blogLink = (data === null || data === void 0 ? void 0 : data.wp_http1) + '?re=' + token;
        const waitTime = 1000 * (Number(data === null || data === void 0 ? void 0 : data.total_time) + 3);
        await abortableTimeout(waitTime, { signal });
        console.log('blogLink', blogLink);
        let vcloudLink = 'Invalid Request';
        while (vcloudLink.includes('Invalid Request')) {
            const blogRes = await fetch(blogLink, { headers, signal });
            const blogResText = await blogRes.text();
            if (!blogResText.includes('Invalid Request')) {
                const match = blogResText.match(/var reurl = "([^"]+)"/);
                vcloudLink = match ? match[1] : '';
                break;
            }
            console.log(blogResText);
        }
        return blogLink || link;
    }
    catch (err) {
        console.log('Error in getRedirectLinks', err);
        return link;
    }
}
// Main extractor for hubcloud links
async function hubcloudExtractor(link, signal, axiosInstance, cheerioModule, headers) {
    var _a, _b, _c, _d, _e, _f;
    try {
        headers.Cookie =
            'ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg-1770053679-1.2.1.1-xBrQdciOJsweUF6F2T_OtH6jmyanN_TduQ0yslc_XqjU6RcHSxI7.YOKv6ry7oYo64868HYoULnVyww536H2eVI3R2e4wKzsky6abjPdfQPxqpUaXjxfJ02o6jl3_Vkwr4uiaU7Wy596Vdst3y78HXvVmKdIohhtPvp.vZ9_L7wvWdce0GRixjh_6JiqWmWMws46hwEt3hboaS1e1e4EoWCvj5b0M_jVwvSxBOAW5emFzvT3QrnRh4nyYmKDERnY';
        console.log('hubcloudExtractor', link);
        console.log('headers', headers);
        const baseUrl = link.split('/').slice(0, 3).join('/');
        const streamLinks = [];
        const vLinkText = (await axiosInstance.get(link, { headers, signal })).data;
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
            headers,
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
                            headers,
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
                                headers,
                                signal,
                                redirect: 'manual',
                            });
                            if (newLinkRes2.status >= 300 && newLinkRes2.status < 400) {
                                newLink =
                                    ((_c = newLinkRes2.headers.get('location')) === null || _c === void 0 ? void 0 : _c.split('?link=')[1]) || newLink;
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
// Main getStream function that handles hubdrive links and delegates to hubcloudExtractor
async function getStream({ link, signal, providerContext, }) {
    var _a, _b, _c, _d;
    const { axios: axiosInstance, cheerio: cheerioModule, commonHeaders } = providerContext;
    let hubdriveLink = '';
    if (link.includes('hubdrive')) {
        const hubdriveText = (await axiosInstance.get(link, { headers: commonHeaders, signal })).data;
        hubdriveLink =
            cheerioModule
                .load(hubdriveText)('.btn.btn-primary.btn-user.btn-success1.m-1')
                .attr('href') || link;
    }
    else {
        const pageRes = await axiosInstance.get(link, { headers: commonHeaders, signal });
        const pageData = pageRes.data;
        // Extract the encrypted string
        const encodedPart = (_c = (_b = (_a = pageData.split("s('o','")) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.split("',180")) === null || _c === void 0 ? void 0 : _c[0];
        const decodedObj = encodedPart ? decodeString(encodedPart) : null;
        let decodedLink = (decodedObj === null || decodedObj === void 0 ? void 0 : decodedObj.o) ? atob(decodedObj.o) : link;
        const redirectLink = await getRedirectLinks(decodedLink, signal, commonHeaders);
        console.log('redirectLink', redirectLink);
        if (redirectLink.includes('hubcloud') || redirectLink.includes('/drive/')) {
            return await hubcloudExtractor(redirectLink, signal, axiosInstance, cheerioModule, commonHeaders);
        }
        const redirectText = (await axiosInstance.get(redirectLink, { headers: commonHeaders, signal })).data;
        hubdriveLink =
            cheerioModule
                .load(redirectText)('h3:contains("1080p")')
                .find('a')
                .attr('href') ||
                ((_d = redirectText.match(/href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/)) === null || _d === void 0 ? void 0 : _d[1]) ||
                redirectLink;
        if (hubdriveLink.includes('hubdrive')) {
            const hubdriveText = (await axiosInstance.get(hubdriveLink, { headers: commonHeaders, signal })).data;
            hubdriveLink =
                cheerioModule
                    .load(hubdriveText)('.btn.btn-primary.btn-user.btn-success1.m-1')
                    .attr('href') || hubdriveLink;
        }
    }
    const hubcloudMatch = (await axiosInstance.get(hubdriveLink, { headers: commonHeaders, signal })).data.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i);
    const hubcloudLink = (hubcloudMatch === null || hubcloudMatch === void 0 ? void 0 : hubcloudMatch[1]) || hubdriveLink;
    try {
        return await hubcloudExtractor(hubcloudLink, signal, axiosInstance, cheerioModule, commonHeaders);
    }
    catch (error) {
        console.log('hd hub 4 getStream error: ', error);
        return [];
    }
}
