"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = getStream;
// Base64 encoded fallback domains from Kotlin
const newTvDomains = [
    "aHR0cHM6Ly9tb2JpbGVkZXRlY3RzLmNvbQ==", "aHR0cHM6Ly9tb2JpbGVkZXRlY3QuYXBw",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0LmFydA==", "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNj",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNsaWNr", "aHR0cHM6Ly9tb2JpZGV0ZWN0Lmluaw==",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0LmxpdmU=", "aHR0cHM6Ly9tb2JpZGV0ZWN0LnBybw==",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNob3A=", "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNpdGU=",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNwYWNl", "aHR0cHM6Ly9tb2JpZGV0ZWN0LnN0b3Jl",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0LnZpcA==", "aHR0cHM6Ly9tb2JpZGV0ZWN0Lndpa2k=",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0Lnh5eg==", "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5hcnQ=",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5jYw==", "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5pbmZv",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5pbms=", "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5saXZl",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5wcm8=", "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5zdG9yZQ==",
    "aHR0cHM6Ly9tb2JpZGV0ZWN0cy50b3A=", "aHR0cHM6Ly9tb2JpZGV0ZWN0cy54eXo="
];
const newTvBaseHeaders = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Requested-With": "NetmirrorNewTV v1.0",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
    "Accept": "application/json, text/plain, */*"
};
/**
 * Pure JS Base64 Decoder (React Native Safe)
 */
function decodeBase64(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    str = String(str).replace(/=+$/, '');
    for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ?
        output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
    }
    return output;
}
/**
 * 🔗 Dynamically resolves the API base URL by pinging encoded domains
 */
async function resolveApiUrl(axios) {
    var _a;
    for (const encoded of newTvDomains) {
        const base = decodeBase64(encoded).replace(/\/$/, '');
        try {
            const res = await axios.get(`${base}/checknewtv.php`, { headers: newTvBaseHeaders, timeout: 3000 });
            const tokenHash = (_a = res.data) === null || _a === void 0 ? void 0 : _a.token_hash;
            if (tokenHash) {
                return decodeBase64(tokenHash).replace(/\/$/, '');
            }
        }
        catch (e) {
            // Silently try the next domain
            continue;
        }
    }
    throw new Error("Failed to resolve NewTV API base URL");
}
async function getStream({ link, providerContext, }) {
    const { axios } = providerContext;
    // link format: "ID|Title" - we just need the ID to fetch streams now.
    const [id] = link.split("|");
    const streams = [];
    try {
        // STEP 1: Get dynamic base API URL
        const apiBase = await resolveApiUrl(axios);
        // STEP 2: Build headers specific to Hotstar (Ott: 'hs')
        const headers = {
            ...newTvBaseHeaders,
            "Ott": "hs", // 'hs' is what Hotstar expects according to Kotlin
            "Usertoken": ""
        };
        // STEP 3: Request the player endpoint
        const res = await axios.get(`${apiBase}/newtv/player.php?id=${id}`, { headers });
        const data = res.data;
        // STEP 4: Parse response and return the stream
        if ((data === null || data === void 0 ? void 0 : data.status) === "ok" && (data === null || data === void 0 ? void 0 : data.video_link)) {
            streams.push({
                server: `Hotstar Auto`,
                link: data.video_link, // M3U8 link
                type: "m3u8",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Android) ExoPlayer",
                    "Accept": "*/*",
                    // Interceptor in Kotlin adds this cookie specifically for .m3u8 playback
                    "Cookie": "hd=on",
                    "Referer": data.referer || apiBase,
                },
            });
        }
    }
    catch (e) {
        console.error("Hotstar stream extraction failed:", e.message);
    }
    return streams;
}
