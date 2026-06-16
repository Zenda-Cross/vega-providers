"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeta = getMeta;
const MAIN_URL = "https://net52.cc";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const BASE_HEADERS = {
    "User-Agent": USER_AGENT,
    "X-Requested-With": "XMLHttpRequest",
    "Referer": `${MAIN_URL}/home`,
    "Cookie": "ott=nf; hd=on;",
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
                const raw = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
                const match = raw.match(/t_hash_t=([^;]+)/);
                if (match)
                    return match[1];
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
        catch (e) {
            console.error(`Netflix bypass error (attempt ${i + 1}):`, e.message);
        }
    }
    return "";
}
async function getMeta({ link, providerContext }) {
    const { axios } = providerContext;
    const id = link;
    const unixTime = Math.floor(Date.now() / 1000);
    const tHash = await getBypassCookie(axios);
    const headers = {
        ...BASE_HEADERS,
        Cookie: `${BASE_HEADERS.Cookie} t_hash_t=${tHash};`,
    };
    try {
        const res = await axios.get(`${MAIN_URL}/mobile/post.php?id=${id}&t=${unixTime}`, { headers });
        const data = res.data;
        const title = (data === null || data === void 0 ? void 0 : data.title) || "";
        const desc = (data === null || data === void 0 ? void 0 : data.desc) || "";
        const image = `https://imgcdn.kim/poster/v/${id}.jpg`;
        const hasEpisodes = Array.isArray(data === null || data === void 0 ? void 0 : data.episodes) &&
            data.episodes.length > 0 &&
            data.episodes[0] !== null;
        const info = {
            title,
            synopsis: desc,
            image,
            imdbId: "",
            type: hasEpisodes ? "series" : "movie",
            linkList: [],
        };
        if (!hasEpisodes) {
            info.linkList.push({
                title: "▶ Play Movie",
                quality: "HD",
                episodesLink: "",
                directLinks: [
                    {
                        title: "Default Server",
                        link: `${id}|${title}`,
                    },
                ],
            });
            return info;
        }
        const seasons = Array.isArray(data === null || data === void 0 ? void 0 : data.season) ? data.season : [];
        seasons.forEach((s, index) => {
            var _a;
            const seasonId = (_a = s === null || s === void 0 ? void 0 : s.id) !== null && _a !== void 0 ? _a : `${index + 1}`;
            const seasonNumber = index + 1;
            info.linkList.push({
                title: `Season ${seasonNumber}`,
                quality: "Default",
                episodesLink: `${id}|${seasonId}|${title}|series`,
                directLinks: [],
            });
        });
        return info;
    }
    catch (e) {
        console.error("Netflix meta error:", e.message);
        return { title: "", synopsis: "", image: "", imdbId: "", type: "movie", linkList: [] };
    }
}
