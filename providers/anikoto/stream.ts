import { ProviderContext, SkipInterval, Stream, TextTracks } from "../types";
import { throwProviderError } from "../providerErrors";

const BASE_URL = "https://anikototv.to";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "*/*",
};

function decodeBase64(str: string): string {
  if (typeof atob === "function") {
    try {
      return atob(str);
    } catch {
      // fallback
    }
  }
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(str, "base64").toString("binary");
    } catch {
      // fallback
    }
  }
  return "";
}

function encodeBase64(str: string): string {
  if (typeof btoa === "function") {
    try {
      return btoa(str);
    } catch {
      // fallback
    }
  }
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(str, "binary").toString("base64");
    } catch {
      // fallback
    }
  }
  return "";
}

function rc4(key: string, input: string): string {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let a = 0;
  for (let n = 0; n < 256; n++) {
    a = (s[n] + a + key.charCodeAt(n % key.length)) % 256;
    const tmp = s[n];
    s[n] = s[a];
    s[a] = tmp;
  }
  let out = "";
  let n2 = 0;
  let a2 = 0;
  for (let r = 0; r < input.length; r++) {
    n2 = (n2 + 1) % 256;
    a2 = (s[n2] + a2) % 256;
    const tmp2 = s[n2];
    s[n2] = s[a2];
    s[a2] = tmp2;
    const k = s[(s[n2] + s[a2]) % 256];
    out += String.fromCharCode(input.charCodeAt(r) ^ k);
  }
  return out;
}

function encodeVrf(animeId: string): string {
  const encrypted = rc4("simple-hash", animeId);
  return encodeBase64(encrypted);
}

const AES_SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];
const AES_INV_SBOX = new Uint8Array(256);
for (let i = 0; i < 256; i++) AES_INV_SBOX[AES_SBOX[i]] = i;

const AES_RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function aesKeyExpansion(keyBytes: Uint8Array): Uint32Array {
  const w = new Uint32Array(60);
  for (let i = 0; i < 8; i++) {
    w[i] = (keyBytes[4 * i] << 24) | (keyBytes[4 * i + 1] << 16) | (keyBytes[4 * i + 2] << 8) | keyBytes[4 * i + 3];
  }
  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      temp = (temp << 8) | (temp >>> 24);
      temp =
        (AES_SBOX[(temp >>> 24) & 0xff] << 24) |
        (AES_SBOX[(temp >>> 16) & 0xff] << 16) |
        (AES_SBOX[(temp >>> 8) & 0xff] << 8) |
        AES_SBOX[temp & 0xff];
      temp ^= AES_RCON[i / 8] << 24;
    } else if (i % 8 === 4) {
      temp =
        (AES_SBOX[(temp >>> 24) & 0xff] << 24) |
        (AES_SBOX[(temp >>> 16) & 0xff] << 16) |
        (AES_SBOX[(temp >>> 8) & 0xff] << 8) |
        AES_SBOX[temp & 0xff];
    }
    w[i] = w[i - 8] ^ temp;
  }
  return w;
}

function aesMul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function aesInvMixColumns(s: Uint8Array): void {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a = s[i];
    const b = s[i + 1];
    const d = s[i + 2];
    const e = s[i + 3];
    s[i] = aesMul(0x0e, a) ^ aesMul(0x0b, b) ^ aesMul(0x0d, d) ^ aesMul(0x09, e);
    s[i + 1] = aesMul(0x09, a) ^ aesMul(0x0e, b) ^ aesMul(0x0b, d) ^ aesMul(0x0d, e);
    s[i + 2] = aesMul(0x0d, a) ^ aesMul(0x09, b) ^ aesMul(0x0e, d) ^ aesMul(0x0b, e);
    s[i + 3] = aesMul(0x0b, a) ^ aesMul(0x0d, b) ^ aesMul(0x09, d) ^ aesMul(0x0e, e);
  }
}

function aesDecryptBlock(block: Uint8Array, w: Uint32Array): Uint8Array {
  const state = new Uint8Array(block);
  const Nr = 14;

  for (let c = 0; c < 4; c++) {
    const rk = w[Nr * 4 + c];
    state[c * 4] ^= (rk >>> 24) & 0xff;
    state[c * 4 + 1] ^= (rk >>> 16) & 0xff;
    state[c * 4 + 2] ^= (rk >>> 8) & 0xff;
    state[c * 4 + 3] ^= rk & 0xff;
  }

  for (let round = Nr - 1; round >= 1; round--) {
    const t1 = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t1;
    const t2 = state[2]; state[2] = state[10]; state[10] = t2;
    const t6 = state[6]; state[6] = state[14]; state[14] = t6;
    const t3 = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t3;

    for (let i = 0; i < 16; i++) state[i] = AES_INV_SBOX[state[i]];

    for (let c = 0; c < 4; c++) {
      const rk = w[round * 4 + c];
      state[c * 4] ^= (rk >>> 24) & 0xff;
      state[c * 4 + 1] ^= (rk >>> 16) & 0xff;
      state[c * 4 + 2] ^= (rk >>> 8) & 0xff;
      state[c * 4 + 3] ^= rk & 0xff;
    }

    aesInvMixColumns(state);
  }

  const t1 = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t1;
  const t2 = state[2]; state[2] = state[10]; state[10] = t2;
  const t6 = state[6]; state[6] = state[14]; state[14] = t6;
  const t3 = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t3;

  for (let i = 0; i < 16; i++) state[i] = AES_INV_SBOX[state[i]];

  for (let c = 0; c < 4; c++) {
    const rk = w[c];
    state[c * 4] ^= (rk >>> 24) & 0xff;
    state[c * 4 + 1] ^= (rk >>> 16) & 0xff;
    state[c * 4 + 2] ^= (rk >>> 8) & 0xff;
    state[c * 4 + 3] ^= rk & 0xff;
  }

  return state;
}

function aesDecryptCbcPureJs(cipherBytes: Uint8Array, keyBytes: Uint8Array, ivBytes: Uint8Array): Uint8Array {
  const w = aesKeyExpansion(keyBytes);
  const out = new Uint8Array(cipherBytes.length);
  let prev = ivBytes;
  for (let offset = 0; offset < cipherBytes.length; offset += 16) {
    const block = cipherBytes.subarray(offset, offset + 16);
    const decrypted = aesDecryptBlock(block, w);
    for (let i = 0; i < 16; i++) {
      out[offset + i] = decrypted[i] ^ prev[i];
    }
    prev = block;
  }
  const pad = out[out.length - 1];
  if (pad > 0 && pad <= 16) {
    return out.subarray(0, out.length - pad);
  }
  return out;
}

async function decryptMegaPlay(encStr: string): Promise<string> {
  if (!encStr || typeof encStr !== "string") return "";

  const keyStr = "i?LMTAx0Q6,:}50U";
  const ivStr = "W0;27ToaUpl_P%'c";

  const keyBytes = new Uint8Array(32);
  const ivBytes = new Uint8Array(16);
  for (let i = 0; i < Math.min(32, keyStr.length); i++) {
    keyBytes[i] = keyStr.charCodeAt(i);
  }
  for (let i = 0; i < Math.min(16, ivStr.length); i++) {
    ivBytes[i] = ivStr.charCodeAt(i);
  }

  let b64 = encStr.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) {
    b64 += "====".slice(pad);
  }

  const binaryStr = typeof atob === "function" ? atob(b64) : decodeBase64(b64);
  const cipherBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    cipherBytes[i] = binaryStr.charCodeAt(i);
  }

  // 1. Try native WebCrypto API (standard in modern Browser WebWorkers, Secure Contexts, & Node 19+)
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    try {
      const cryptoKey = await globalThis.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
      );

      const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
        { name: "AES-CBC", iv: ivBytes },
        cryptoKey,
        cipherBytes
      );

      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(decryptedBuffer);
      } else {
        const bytes = new Uint8Array(decryptedBuffer);
        let str = "";
        for (let i = 0; i < bytes.length; i++) {
          str += String.fromCharCode(bytes[i]);
        }
        return decodeURIComponent(escape(str));
      }
    } catch {
      // Fallback to pure JS below
    }
  }

  // 2. Pure JavaScript AES-256-CBC Decryption (100% browser WebWorker & sandbox compatible with ZERO dependencies)
  try {
    const decryptedBytes = aesDecryptCbcPureJs(cipherBytes, keyBytes, ivBytes);
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder().decode(decryptedBytes);
    } else {
      let str = "";
      for (let i = 0; i < decryptedBytes.length; i++) {
        str += String.fromCharCode(decryptedBytes[i]);
      }
      return decodeURIComponent(escape(str));
    }
  } catch {
    // Fallback
  }

  return "";
}

function inferLang(label: string): string {
  const l = (label || "").toLowerCase();
  if (l.includes("english") || l.includes("eng")) return "en";
  if (l.includes("spanish") || l.includes("spa") || l.includes("es-")) return "es";
  if (l.includes("french") || l.includes("fra") || l.includes("fre")) return "fr";
  if (l.includes("german") || l.includes("deu") || l.includes("ger")) return "de";
  if (l.includes("portuguese") || l.includes("por")) return "pt";
  if (l.includes("italian") || l.includes("ita")) return "it";
  if (l.includes("japanese") || l.includes("jpn")) return "ja";
  if (l.includes("chinese") || l.includes("chi") || l.includes("zho")) return "zh";
  if (l.includes("indonesian") || l.includes("ind")) return "id";
  if (l.includes("thai") || l.includes("tha")) return "th";
  if (l.includes("vietnamese") || l.includes("vie")) return "vi";
  if (l.includes("arabic") || l.includes("ara")) return "ar";
  if (l.includes("hindi") || l.includes("hin")) return "hi";
  if (l.includes("korean") || l.includes("kor")) return "ko";
  if (l.includes("russian") || l.includes("rus")) return "ru";
  return "und";
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio } = providerContext;
    const payload = (() => {
      try {
        return JSON.parse(link);
      } catch {
        return { slug: link, epNum: "1" };
      }
    })();

    let slug: string = payload.slug || "";
    let epNum: string = String(payload.epNum || "1");
    let dataIds: string = payload.dataIds || "";

    if (!slug && typeof link === "string") {
      slug = link;
    }

    if (slug.includes("/watch/")) {
      const match = slug.match(/\/watch\/([^/]+)(?:\/ep-(\d+))?/);
      if (match) {
        slug = match[1];
        if (match[2]) epNum = match[2];
      }
    } else if (slug.startsWith("http")) {
      const parts = slug.replace(/\/+$/, "").split("/");
      slug = parts[parts.length - 1];
    }

    if (!slug) return [];

    const watchUrl = `${BASE_URL}/watch/${slug}/ep-${epNum || 1}`;

    const headers = {
      ...defaultHeaders,
      Referer: `${BASE_URL}/`,
    };

    // If dataIds is missing, fetch fresh episode list
    if (!dataIds) {
      const detailRes = await axios.get(watchUrl, { headers });
      const $d = cheerio.load(detailRes.data);
      const animeId = $d(
        "#watch-page, #watch-main, .watch-wrap, [data-id]"
      )
        .first()
        .attr("data-id");

      if (animeId) {
        const vrf = encodeURIComponent(encodeVrf(animeId));
        const epRes = await axios.get(
          `${BASE_URL}/ajax/episode/list/${animeId}?vrf=${vrf}&style=default`,
          {
            headers: {
              ...headers,
              "X-Requested-With": "XMLHttpRequest",
              Referer: watchUrl,
            },
          }
        );
        if (epRes.data?.result) {
          const $ep = cheerio.load(epRes.data.result);
          const epEl = $ep(
            `ul.ep-range a[data-num="${epNum}"], .ep-range a[data-num="${epNum}"], a[data-ids]`
          ).first();
          dataIds = epEl.attr("data-ids") || "";
        }
      }
    }

    if (!dataIds) {
      return [];
    }

    const serverListUrl = `${BASE_URL}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`;
    const srvRes = await axios.get(serverListUrl, {
      headers: {
        ...headers,
        "X-Requested-With": "XMLHttpRequest",
        Referer: watchUrl,
      },
    });

    if (!srvRes.data || srvRes.data.status !== 200 || !srvRes.data.result) {
      return [];
    }

    const $s = cheerio.load(srvRes.data.result);
    const tasks: { dataType: string; serverName: string; linkId: string }[] = [];
    const seenLinkIds = new Set<string>();

    $s("div.type, .server-type, div.types > div.type, div.servers > div.type").each((_, typeEl) => {
      const dataType = $s(typeEl).attr("data-type") || "sub";
      $s(typeEl)
        .find("[data-link-id], [data-id], .item")
        .each((_, sEl) => {
          const linkId = $s(sEl).attr("data-link-id") || $s(sEl).attr("data-id") || "";
          const serverName = $s(sEl).text().trim() || "Server";
          if (linkId && !seenLinkIds.has(linkId)) {
            seenLinkIds.add(linkId);
            tasks.push({ dataType, serverName, linkId });
          }
        });
    });

    const streams: Stream[] = [];
    const seenStreamLinks = new Set<string>();

    const addStream = (stream: Stream) => {
      if (!stream.link || seenStreamLinks.has(stream.link)) return;
      seenStreamLinks.add(stream.link);
      streams.push(stream);
    };

    const skipTimings =
      await providerContext.kvStore?.get<boolean>("anikoto_skipTimings");
    const skipTimingsEnabled = skipTimings ?? true;

    await Promise.all(
      tasks.map(async (task) => {
        try {
          const getUrl = `${BASE_URL}/ajax/server?get=${encodeURIComponent(
            task.linkId
          )}`;
          const getRes = await axios.get(getUrl, {
            headers: {
              ...headers,
              "X-Requested-With": "XMLHttpRequest",
              Referer: watchUrl,
            },
            timeout: 8000,
          });

          const iframeUrl = getRes.data?.result?.url;
          if (!iframeUrl) return;

          let skipIntervals: SkipInterval[] | undefined = undefined;
          if (skipTimingsEnabled) {
            const skipData = getRes.data?.result?.skip_data;
            if (skipData && typeof skipData === "object") {
              const intervals: SkipInterval[] = [];
              if (Array.isArray(skipData.intro) && skipData.intro.length >= 2) {
                const from = Number(skipData.intro[0]);
                const to = Number(skipData.intro[1]);
                if (!isNaN(from) && !isNaN(to) && to > from) {
                  intervals.push({ title: "Intro", from, to });
                }
              }
              if (Array.isArray(skipData.outro) && skipData.outro.length >= 2) {
                const from = Number(skipData.outro[0]);
                const to = Number(skipData.outro[1]);
                if (!isNaN(from) && !isNaN(to) && to > from) {
                  intervals.push({ title: "Outro", from, to });
                }
              }
              if (intervals.length > 0) {
                skipIntervals = intervals;
              }
            }
          }

          let host = "";
          try {
            host = new URL(iframeUrl).host;
          } catch {
            host = iframeUrl.split("://")[1]?.split("/")[0] || "";
          }
          const audioLabel = task.dataType.toUpperCase();

          // Flow 1: Kiwi / VibePlayer (iframe URL containing base64 #fragment)
          if (iframeUrl.includes("#")) {
            const fragment = iframeUrl.substring(iframeUrl.indexOf("#") + 1);
            if (fragment) {
              try {
                const decoded = decodeBase64(fragment);
                if (decoded && decoded.startsWith("http")) {
                  const kiwiHeaders = {
                    Referer: "https://vibeplayer.site/",
                    Origin: "https://vibeplayer.site",
                    "User-Agent": defaultHeaders["User-Agent"],
                  };

                  addStream({
                    server: `${task.serverName} (${audioLabel})`,
                    link: decoded,
                    type: "m3u8",
                    quality: "auto",
                    headers: kiwiHeaders,
                    skip: skipIntervals,
                  });

                  try {
                    const m3u8Res = await axios.get(decoded, {
                      headers: kiwiHeaders,
                      timeout: 6000,
                    });
                    const lines: string[] = m3u8Res.data.split("\n");
                    const baseUrl = decoded.substring(0, decoded.lastIndexOf("/") + 1);

                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i].trim();
                      if (line.startsWith("#EXT-X-STREAM-INF")) {
                        const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                        const quality = resMatch ? `${resMatch[1]}p` : "unknown";
                        const nextLine = lines[i + 1]?.trim();
                        if (nextLine && !nextLine.startsWith("#")) {
                          const streamUrl = nextLine.startsWith("http")
                            ? nextLine
                            : baseUrl + nextLine;
                          addStream({
                            server: `${task.serverName} (${audioLabel}) ${quality}`,
                            link: streamUrl,
                            type: "m3u8",
                            quality,
                            headers: kiwiHeaders,
                            skip: skipIntervals,
                          });
                        }
                      }
                    }
                  } catch {
                    // master already added
                  }
                }
              } catch {
                // ignore
              }
            }
          }

          // Flow 2: VidTube / MegaPlay / VidWish / Mewstream
          try {
            const pageRes = await axios.get(iframeUrl, {
              headers: {
                ...headers,
                Referer: `https://${host}/`,
                Origin: `https://${host}`,
              },
              timeout: 8000,
            });

            const matchId = pageRes.data.match(/data-id=["']?([^"'\s>]+)["']?/i);
            const matchRealId = pageRes.data.match(/data-realid=["']?([^"'\s>]+)["']?/i);
            const urlIdMatch = iframeUrl.match(/\/stream\/[^/]+\/([^/?#]+)/);

            const dataId = matchId ? matchId[1] : (urlIdMatch ? urlIdMatch[1] : "");
            const realId = matchRealId ? matchRealId[1] : "";

            const idCandidates = [dataId, realId].filter(Boolean);
            if (idCandidates.length > 0) {
              let sParam = "";
              try {
                const parsedUrl = new URL(iframeUrl);
                sParam = parsedUrl.searchParams.get("s") || "";
              } catch {
                const matchS = iframeUrl.match(/[?&]s=([^&]+)/);
                if (matchS) sParam = matchS[1];
              }

              let typeParam = task.dataType;
              if (iframeUrl.includes("/hsub")) typeParam = "hsub";
              else if (iframeUrl.includes("/hdub")) typeParam = "hdub";

              const typeCandidates = [typeParam, task.dataType, "sub", "dub"]
                .filter((v, idx, arr) => !!v && arr.indexOf(v) === idx);

              const sCandidates = [sParam, "tcdn", "bcdn", ""]
                .filter((v, idx, arr) => arr.indexOf(v) === idx);

              const apiHeaders = {
                ...headers,
                "X-Requested-With": "XMLHttpRequest",
                Referer: iframeUrl,
                Origin: `https://${host}`,
              };

              let srcData: any = null;
              let masterUrl = "";

              outerLoop: for (const currId of idCandidates) {
                for (const currType of typeCandidates) {
                  for (const currS of sCandidates) {
                    const sQuery = currS ? `&s=${encodeURIComponent(currS)}` : "";
                    const endpoints = [
                      `https://${host}/stream/getSources?id=${currId}&type=${currType}${sQuery}`,
                      `https://${host}/stream/getSourcesNew?id=${currId}&type=${currType}${sQuery}`,
                      `https://${host}/stream/getSources?id=${currId}&id=${currId}&type=${currType}&type=${currType}${sQuery}`,
                    ];

                    for (const endpoint of endpoints) {
                      try {
                        const srcRes = await axios.get(endpoint, {
                          headers: apiHeaders,
                          timeout: 8000,
                        });
                        const data = srcRes.data;
                        if (data) {
                          let candidate = "";

                          // Handle encrypted response (MegaPlay)
                          if (data.enc && typeof data.enc === "string") {
                            try {
                              const decrypted = await decryptMegaPlay(data.enc);
                              if (decrypted) {
                                try {
                                  const parsed = JSON.parse(decrypted);
                                  if (typeof parsed === "string" && parsed.startsWith("http")) {
                                    candidate = parsed;
                                  } else if (typeof parsed?.file === "string" && parsed.file.startsWith("http")) {
                                    candidate = parsed.file;
                                  } else if (typeof parsed?.sources === "string" && parsed.sources.startsWith("http")) {
                                    candidate = parsed.sources;
                                  } else if (typeof parsed?.sources?.file === "string" && parsed.sources.file.startsWith("http")) {
                                    candidate = parsed.sources.file;
                                  } else if (Array.isArray(parsed?.sources) && parsed.sources.length > 0) {
                                    const first = parsed.sources[0];
                                    candidate = typeof first === "string" ? first : first?.file || "";
                                  }
                                } catch {
                                  if (decrypted.startsWith("http")) {
                                    candidate = decrypted;
                                  }
                                }
                              }
                            } catch {
                              // ignore
                            }
                          }

                          // Handle unencrypted sources (Legacy VidTube / VidWish)
                          if (!candidate) {
                            if (typeof data.sources === "string" && data.sources.startsWith("http")) {
                              candidate = data.sources;
                            } else if (typeof data.sources?.file === "string" && data.sources.file.startsWith("http")) {
                              candidate = data.sources.file;
                            } else if (Array.isArray(data.sources) && data.sources.length > 0) {
                              const first = data.sources[0];
                              candidate = typeof first === "string" ? first : first?.file || "";
                            } else if (typeof data.file === "string" && data.file.startsWith("http")) {
                              candidate = data.file;
                            }
                          }

                          if (candidate && candidate.startsWith("http")) {
                            masterUrl = candidate;
                            srcData = data;
                            break outerLoop;
                          }
                        }
                      } catch {
                        // try next endpoint
                      }
                    }
                  }
                }
              }

              if (masterUrl) {
                const streamHeaders = {
                  Referer: `https://${host}/`,
                  Origin: `https://${host}`,
                  "User-Agent": defaultHeaders["User-Agent"],
                };

                const subtitles: TextTracks = (srcData?.tracks || [])
                  .filter((t: any) => t.file && t.label && typeof t.file === "string" && t.file.startsWith("http"))
                  .map((t: any) => ({
                    title: t.label,
                    language: inferLang(t.label),
                    type: "text/vtt" as const,
                    uri: `https://worker.zendax.me/api/fetch?url=${encodeURIComponent(
                      t.file
                    )}&headers=${encodeURIComponent(JSON.stringify(streamHeaders))}`,
                  }));

                // Add Master stream
                addStream({
                  server: `${task.serverName} (${audioLabel})`,
                  link: masterUrl,
                  type: "m3u8",
                  quality: "auto",
                  subtitles: subtitles.length > 0 ? subtitles : undefined,
                  headers: streamHeaders,
                  skip: skipIntervals,
                });

                // Parse master m3u8 for resolution sub-streams
                try {
                  const m3u8Res = await axios.get(masterUrl, {
                    headers: streamHeaders,
                    timeout: 6000,
                  });
                  const lines: string[] = m3u8Res.data.split("\n");
                  const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf("/") + 1);

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith("#EXT-X-STREAM-INF")) {
                      const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                      const quality = resMatch ? `${resMatch[1]}p` : "unknown";
                      const nextLine = lines[i + 1]?.trim();
                      if (nextLine && !nextLine.startsWith("#")) {
                        const streamUrl = nextLine.startsWith("http")
                          ? nextLine
                          : baseUrl + nextLine;
                        addStream({
                          server: `${task.serverName} (${audioLabel}) ${quality}`,
                          link: streamUrl,
                          type: "m3u8",
                          quality,
                          subtitles: subtitles.length > 0 ? subtitles : undefined,
                          headers: streamHeaders,
                          skip: skipIntervals,
                        });
                      }
                    }
                  }
                } catch {
                  // Master stream already added
                }
              }
            }
          } catch {
            // ignore individual iframe page error
          }
        } catch {
          // ignore individual server task error
        }
      })
    );

    return streams;
  } catch (err) {
    throwProviderError("Anikoto", "stream", err);
  }
};
