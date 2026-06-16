"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = getEpisodes;
const MAIN_URL = "https://net52.cc";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const baseHeaders = {
    "User-Agent": USER_AGENT,
    "X-Requested-With": "XMLHttpRequest",
    Cookie: "ott=nf; hd=on;",
    Referer: `${MAIN_URL}/home`,
};
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
async function getBypassCookie(axios) {
    for (let i = 0; i < 3; i++) {
        try {
            const uuid = generateUUID();
            const data = `g-recaptcha-response=${uuid}`;
            const res = await axios.post(`${MAIN_URL}/verify.php`, data, {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Cache-Control": "max-age=0",
                    "Connection": "keep-alive",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Origin": "https://net22.cc",
                    "Referer": "https://net22.cc/verify2",
                    "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                    "User-Agent": USER_AGENT
                },
                maxRedirects: 0,
                // Crucial: Do not throw error on 403, we still need to read the headers!
                validateStatus: () => true
            });
            const setCookie = res.headers["set-cookie"];
            if (setCookie) {
                const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
                const match = cookieStr.match(/t_hash_t=([^;]+)/);
                if (match)
                    return match[1];
            }
            // If we didn't get a cookie but didn't error out, wait and retry
            await new Promise((r) => setTimeout(r, 1000));
        }
        catch (e) {
            console.error(`Bypass cookie error (attempt ${i + 1}):`, e.message);
        }
    }
    return "";
}
async function getEpisodes({ url, providerContext }) {
    const { axios } = providerContext;
    const unixTime = Math.floor(Date.now() / 1000);
    const [seriesId, seasonId, rawTitle, type] = url.split("|");
    const title = (rawTitle || "").replace(/[^a-zA-Z0-9 ]/g, "");
    if (type === "movie") {
        return [{
                title: "Full Movie",
                link: `${seriesId}|${title}`,
                image: `https://imgcdn.kim/poster/v/${seriesId}.jpg`,
            }];
    }
    const episodes = [];
    const bypassCookie = await getBypassCookie(axios);
    if (!bypassCookie)
        return [];
    const headers = {
        ...baseHeaders,
        Cookie: `${baseHeaders.Cookie} t_hash_t=${bypassCookie};`,
    };
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
        const apiUrl = `${MAIN_URL}/mobile/episodes.php?s=${seasonId}` +
            `&series=${seriesId}` +
            `&t=${unixTime}` +
            `&page=${page}`;
        try {
            const res = await axios.get(apiUrl, { headers });
            const data = res.data;
            if (Array.isArray(data === null || data === void 0 ? void 0 : data.episodes)) {
                data.episodes.forEach((ep) => {
                    if (!(ep === null || ep === void 0 ? void 0 : ep.id))
                        return;
                    const epNum = ep.ep ? ep.ep.replace(/[^\d]/g, "") : "";
                    const epName = ep.t || `Episode ${epNum}`;
                    episodes.push({
                        title: `E${epNum} - ${epName}`,
                        link: `${ep.id}|${title}`,
                        image: `https://imgcdn.kim/epimg/150/${ep.id}.jpg`,
                    });
                });
            }
            if ((data === null || data === void 0 ? void 0 : data.nextPageShow) === 0) {
                hasNextPage = false;
            }
            else {
                page++;
            }
        }
        catch (e) {
            console.error("Episodes fetch error:", e.message);
            hasNextPage = false;
        }
    }
    return episodes;
}
