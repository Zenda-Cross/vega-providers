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
exports.getRiveStream = getRiveStream;
const getStream = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link: id, type, providerContext, }) {
    try {
        const streams = [];
        const { imdbId, season, episode, title, tmdbId, year } = JSON.parse(id);
        yield getRiveStream(tmdbId, episode, season, type, streams, providerContext);
        return streams;
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getStream = getStream;
function getRiveStream(tmdId, episode, season, type, Streams, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const secret = generateSecretKey(Number(tmdId));
        const servers = [
            "flowcast",
            "shadow",
            "asiacloud",
            "hindicast",
            "anime",
            "animez",
            "guard",
            "curve",
            "hq",
            "ninja",
            "alpha",
            "kaze",
            "zenesis",
            "genesis",
            "zenith",
            "ghost",
            "halo",
            "kinoecho",
            "ee3",
            "volt",
            "putafilme",
            "ophim",
            "kage",
        ];
        const baseUrl = yield providerContext.getBaseUrl("rive");
        const cors = process.env.CORS_PRXY ? process.env.CORS_PRXY + "?url=" : "";
        console.log("CORS: " + cors);
        const route = type === "series"
            ? `/api/backendfetch?requestID=tvVideoProvider&id=${tmdId}&season=${season}&episode=${episode}&secretKey=${secret}&service=`
            : `/api/backendfetch?requestID=movieVideoProvider&id=${tmdId}&secretKey=${secret}&service=`;
        const url = cors
            ? cors + encodeURIComponent(baseUrl + route)
            : baseUrl + route;
        yield Promise.all(servers.map((server) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            console.log("Rive: " + url + server);
            try {
                const res = yield providerContext.axios.get(url + server, {
                    timeout: 4000,
                    headers: providerContext.commonHeaders,
                });
                const subtitles = [];
                if ((_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.captions) {
                    (_d = (_c = res.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.captions.forEach((sub) => {
                        var _a, _b;
                        subtitles.push({
                            language: ((_a = sub === null || sub === void 0 ? void 0 : sub.label) === null || _a === void 0 ? void 0 : _a.slice(0, 2)) || "Und",
                            uri: sub === null || sub === void 0 ? void 0 : sub.file,
                            title: (sub === null || sub === void 0 ? void 0 : sub.label) || "Undefined",
                            type: ((_b = sub === null || sub === void 0 ? void 0 : sub.file) === null || _b === void 0 ? void 0 : _b.endsWith(".vtt"))
                                ? "text/vtt"
                                : "application/x-subrip",
                        });
                    });
                }
                (_f = (_e = res.data) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.sources.forEach((source) => {
                    Streams.push({
                        server: (source === null || source === void 0 ? void 0 : source.source) + "-" + (source === null || source === void 0 ? void 0 : source.quality),
                        link: source === null || source === void 0 ? void 0 : source.url,
                        type: (source === null || source === void 0 ? void 0 : source.format) === "hls" ? "m3u8" : "mp4",
                        quality: source === null || source === void 0 ? void 0 : source.quality,
                        subtitles: subtitles,
                    });
                });
            }
            catch (e) {
                console.log(e);
            }
        })));
    });
}
function generateSecretKey(id) {
    // Array of secret key fragments - updated array from the new implementation
    const c = [
        "Yhv40uKAZa",
        "nn8YU4yBA",
        "uNeH",
        "ehK",
        "jT0",
        "n5G",
        "99R",
        "MvB1M",
        "DQtPCh",
        "GBRjk4k4I",
        "CzIOoa95UT",
        "BLE8s",
        "GDZlc7",
        "Fz45T",
        "JW6lWn",
        "DE3g4uw0i",
        "18KxmYizv",
        "8ji",
        "JUDdNMnZ",
        "oGpBippPgm",
        "7De8Pg",
        "Zv6",
        "VHT9TVN",
        "bYH6m",
        "aK1",
        "WcWH6jU",
        "Q47YEMi4k",
        "vRD3A",
        "CGOsfJO",
        "BLn8",
        "RgK0drv7l",
        "oPTfGCn3a",
        "MkpMDkttW9",
        "VNI1fPM",
        "XNFi6",
        "6cq",
        "4LvTksXoEI",
        "1rRa2KOZB0",
        "zoOGRb8HT2",
        "mhcXDtvz",
        "NUmexFY2Ur",
        "6BIMdvSZ",
        "Tr0zU2vjRd",
        "QPR",
        "fhOqJR",
        "R9VnFY",
        "xkZ99D6S",
        "umY7E",
        "5Ds8qyDq",
        "Cc6jy09y3",
        "yvU3iR",
        "Bg07zY",
        "GccECglg",
        "VYd",
        "6vOiXqz",
        "7xX",
        "UdRrbEzF",
        "fE6wc",
        "BUd25Rb",
        "lxq5Zum89o",
    ];
    // Handle undefined input
    if (id === undefined) {
        return "rive";
    }
    try {
        let fragment, insertPos;
        // Convert input to string
        const idStr = String(id);
        // Updated string hash function to match the new implementation
        /* eslint-disable no-bitwise */
        const generateStringHash = function (input) {
            input = String(input);
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
                const char = input.charCodeAt(i);
                hash =
                    ((char + (hash << 6) + (hash << 16) - hash) ^ (char << i % 5)) >>> 0;
            }
            hash ^= hash >>> 13;
            hash = (1540483477 * hash) >>> 0;
            return (hash ^= hash >>> 15).toString(16).padStart(8, "0");
        };
        // Updated MurmurHash-like function to match the new implementation
        const applyMurmurHash = function (input) {
            const str = String(input);
            let hash = 3735928559 ^ str.length;
            for (let i = 0; i < str.length; i++) {
                let char = str.charCodeAt(i);
                char ^= ((i + 31) * 131) & 255;
                hash =
                    (668265261 *
                        (hash = (((hash << 7) | (hash >>> 25)) >>> 0) ^ char)) >>>
                        0;
            }
            hash ^= hash >>> 16;
            hash = (2246822507 * hash) >>> 0;
            hash ^= hash >>> 13;
            hash = (3266489909 * hash) >>> 0;
            return (hash ^= hash >>> 16).toString(16).padStart(8, "0");
        };
        /* eslint-enable no-bitwise */
        // Generate the encoded hash using the new implementation
        const encodedHash = btoa(applyMurmurHash(generateStringHash(idStr)));
        // Different handling for non-numeric vs numeric inputs
        if (isNaN(Number(id))) {
            // For non-numeric inputs, sum the character codes
            const charSum = idStr
                .split("")
                .reduce((sum, char) => sum + char.charCodeAt(0), 0);
            // Select array element or fallback to base64 encoded input
            fragment = c[charSum % c.length] || btoa(idStr);
            // Calculate insertion position
            insertPos = Math.floor((charSum % encodedHash.length) / 2);
        }
        else {
            // For numeric inputs, use the number directly
            const numId = Number(id);
            fragment = c[numId % c.length] || btoa(idStr);
            // Calculate insertion position
            insertPos = Math.floor((numId % encodedHash.length) / 2);
        }
        // Construct the final key by inserting the selected value into the base64 string
        return (encodedHash.slice(0, insertPos) + fragment + encodedHash.slice(insertPos));
    }
    catch (error) {
        // Return fallback value if any errors occur
        return "topSecret";
    }
}
