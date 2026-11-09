import { ProviderContext, Stream, TextTracks } from "../types";
import { throwProviderError } from "../providerErrors";
import { API_BASE, commonHeaders, withKartoonsAuth } from "./headers";

// Pure JavaScript: the app sandbox has neither Node crypto nor Buffer.
const SHA256_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];
function rotate(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}
function sha256(value: string): Uint32Array {
  const input = unescape(encodeURIComponent(value));
  const words = new Uint32Array(Math.ceil((input.length + 9) / 64) * 16);
  for (let i = 0; i < input.length; i++) words[i >>> 2] |= input.charCodeAt(i) << (24 - (i % 4) * 8);
  words[input.length >>> 2] |= 0x80 << (24 - (input.length % 4) * 8);
  words[words.length - 1] = input.length * 8;
  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < words.length; offset += 16) {
    w.set(words.subarray(offset, offset + 16));
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      w[i] = w[i - 16] + (rotate(x,7) ^ rotate(x,18) ^ (x >>> 3)) + w[i - 7] + (rotate(y,17) ^ rotate(y,19) ^ (y >>> 10));
    }
    let [a,b,c,d,e,f,g,j] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (j + (rotate(e,6) ^ rotate(e,11) ^ rotate(e,25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const t2 = ((rotate(a,2) ^ rotate(a,13) ^ rotate(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      j=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    const round = [a,b,c,d,e,f,g,j];
    for (let i = 0; i < 8; i++) h[i] += round[i];
  }
  return h;
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
  if (pad < 1 || pad > 16) throw new Error("Invalid Kartoons URL padding");
  for (let i = out.length - pad; i < out.length; i++) {
    if (out[i] !== pad) throw new Error("Invalid Kartoons URL padding");
  }
  return out.subarray(0, out.length - pad);
}

function decodeBase64Url(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (!/^[A-Za-z0-9+/]+$/.test(clean) || clean.length % 4 === 1) throw new Error("Invalid Kartoons encoded URL");
  const bytes: number[] = [];
  let value = 0, bits = 0;
  for (const ch of clean) {
    value = (value << 6) | alphabet.indexOf(ch);
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  return new Uint8Array(bytes);
}

function decodeUtf8(bytes: Uint8Array): string {
  return decodeURIComponent(Array.from(bytes, b => "%" + ("0" + b.toString(16)).slice(-2)).join(""));
}

function decryptUrl(encryptedUrl: string, keyStr = "bca9e0df1a5abb32906ca3f63ac04cef"): string {
  if (!encryptedUrl || typeof encryptedUrl !== "string") return "";
  if (encryptedUrl.startsWith("http://") || encryptedUrl.startsWith("https://")) {
    return encryptedUrl;
  }
  try {
    const raw = decodeBase64Url(encryptedUrl);
    if (raw.length < 32 || raw.length % 16 !== 0) return "";
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) key[i] = keyStr.charCodeAt(i) || 32;
    const decoded = aesDecryptCbcPureJs(raw.subarray(16), key, raw.subarray(0, 16));
    const url = decodeUtf8(decoded);
    return /^https?:\/\//i.test(url) ? url : "";
  } catch {
    return "";
  }
}

// Kartoons' player uses SHA-256(secret) + AES-256-GCM for enc2 playlist URIs.
// Reuse the AES key schedule above; no WebCrypto or native modules are needed.
function aesEncryptBlock(block: Uint8Array, words: Uint32Array): Uint8Array {
  const state = new Uint8Array(block);
  for (let round = 0; round <= 14; round++) {
    if (round > 0) {
      const prev = new Uint8Array(state);
      for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
          state[column * 4 + row] = AES_SBOX[prev[((column + row) % 4) * 4 + row]];
        }
      }
      if (round < 14) {
        for (let column = 0; column < 4; column++) {
          const i = column * 4;
          const [a,b,c,d] = state.subarray(i, i + 4);
          state[i] = aesMul(a,2) ^ aesMul(b,3) ^ c ^ d;
          state[i+1] = a ^ aesMul(b,2) ^ aesMul(c,3) ^ d;
          state[i+2] = a ^ b ^ aesMul(c,2) ^ aesMul(d,3);
          state[i+3] = aesMul(a,3) ^ b ^ c ^ aesMul(d,2);
        }
      }
    }
    for (let i = 0; i < 16; i++) state[i] ^= (words[round * 4 + (i >>> 2)] >>> (24 - (i % 4) * 8)) & 255;
  }
  return state;
}

function gcmMultiply(x: Uint8Array, h: Uint8Array): Uint8Array {
  const result = new Uint8Array(16), v = new Uint8Array(h);
  for (let bit = 0; bit < 128; bit++) {
    if (x[bit >>> 3] & (128 >>> (bit % 8))) {
      for (let i = 0; i < 16; i++) result[i] ^= v[i];
    }
    const low = v[15] & 1;
    for (let i = 15; i >= 0; i--) v[i] = (v[i] >>> 1) | (i > 0 ? (v[i-1] & 1) << 7 : 0);
    if (low) v[0] ^= 0xe1;
  }
  return result;
}

let playlistKey: Uint32Array | undefined;
function decryptPlaylistUrl(encoded: string): string {
  if (!encoded.startsWith("enc2:")) return encoded;
  if (!playlistKey) {
    const digest = sha256("pmS0CAMG1Ruq49WbMyhE3fh1sOuLYEL9rtFazYYljVI2j4BPSog73hW7A7xMhceHD0iwrPrVVDXLvxyWr");
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) key[i] = digest[i >>> 2] >>> (24 - (i % 4) * 8);
    playlistKey = aesKeyExpansion(key);
  }
  const raw = decodeBase64Url(encoded.slice(5));
  if (raw.length < 29) throw new Error("Kartoons playlist URL is truncated");
  const ciphertext = raw.subarray(12, raw.length - 16);
  const counter = new Uint8Array(16);
  counter.set(raw.subarray(0, 12));
  counter[15] = 1;
  const tagMask = aesEncryptBlock(counter, playlistKey);
  const h = aesEncryptBlock(new Uint8Array(16), playlistKey);
  let auth = new Uint8Array(16);
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    for (let i = 0; i < 16; i++) auth[i] ^= ciphertext[offset + i] || 0;
    auth = gcmMultiply(auth, h);
  }
  // No additional authenticated data; the final GHASH block holds bit lengths.
  const bitLength = ciphertext.length * 8;
  for (let i = 0; i < 4; i++) auth[15-i] ^= (bitLength >>> (i * 8)) & 255;
  auth = gcmMultiply(auth, h);
  let invalid = 0;
  for (let i = 0; i < 16; i++) invalid |= auth[i] ^ tagMask[i] ^ raw[raw.length - 16 + i];
  if (invalid) throw new Error("Kartoons playlist URL failed authentication");
  const plain = new Uint8Array(ciphertext.length);
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    for (let i = 15; i >= 12; i--) { counter[i]++; if (counter[i]) break; }
    const block = aesEncryptBlock(counter, playlistKey);
    for (let i = 0; i < 16 && offset + i < plain.length; i++) plain[offset+i] = ciphertext[offset+i] ^ block[i];
  }
  const url = decodeUtf8(plain);
  if (!/^https?:\/\//i.test(url)) throw new Error("Kartoons playlist URL is not HTTP");
  return url;
}

async function resolveWorkerPlaylist(
  url: string, providerContext: ProviderContext, headers: Record<string, string>, signal?: AbortSignal,
  depth = 0, quality = "auto", visited = new Set<string>(),
): Promise<{link: string; quality: string}[]> {
  if (depth > 3 || visited.has(url)) throw new Error("Kartoons playlist contains a loop or too many nested playlists");
  const nextVisited = new Set(visited);
  nextVisited.add(url);
  const response = await providerContext.axios.get(url, {
    headers, signal, responseType: "text", timeout: 20000, maxContentLength: 2097152,
  });
  const text = typeof response.data === "string" ? response.data.trim() : "";
  if (response.status >= 400 || !text.startsWith("#EXTM3U")) throw new Error("Kartoons returned an invalid HLS playlist");
  // A normal media/master playlist is directly playable; encrypted masters are not.
  if (!text.includes("enc2:")) return [{link: url, quality}];
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const results: {link: string; quality: string}[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXT-X-STREAM-INF:")) continue;
    const height = lines[i].match(/RESOLUTION=\d+x(\d+)/i)?.[1];
    let next = i + 1;
    while (next < lines.length && (!lines[next] || lines[next].startsWith("#"))) next++;
    if (next === lines.length) throw new Error("Kartoons playlist is missing its variant URL");
    const variant = new URL(decryptPlaylistUrl(lines[next]), url).href;
    results.push(...await resolveWorkerPlaylist(variant, providerContext, headers, signal, depth + 1, height ? `${height}p` : quality, nextVisited));
    i = next;
  }
  if (!results.length) throw new Error("Kartoons media playlist still contains encrypted URLs");
  // Flattening cannot preserve separate encrypted audio or subtitle playlists.
  if (lines.some(line => line.startsWith("#EXT-X-MEDIA:") && /URI="enc2:/.test(line))) {
    throw new Error("Kartoons playlist requires encrypted external media tracks");
  }
  return results;
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    providerContext = await withKartoonsAuth(providerContext, signal);
    const { axios } = providerContext;
    let contentId = link;
    let isMovie = type === "movie";

    if (link.startsWith("{")) {
      try {
        const parsed = JSON.parse(link);
        contentId = parsed.id || contentId;
        if (parsed.type === "movie") isMovie = true;
        if (parsed.type === "episode" || parsed.type === "show") isMovie = false;
      } catch {}
    }

    const endpoint = isMovie
      ? `/movie/${contentId}/links`
      : `/episode/${contentId}/links`;
    const res = await axios.get(API_BASE + endpoint, {headers:commonHeaders,signal});
    const data = res.data;
    const linksData: any[] = Array.isArray(data?.data?.links) ? data.data.links
      : Array.isArray(data?.data) ? data.data : Array.isArray(data?.links) ? data.links : [];

    const streams: Stream[] = [];
    const resolutionErrors: string[] = [];
    const activeUa = providerContext.commonHeaders["user-agent"] || commonHeaders["user-agent"];

    for (const item of linksData) {
      const rawUrl = item.url || item.link || item.file || item.src;
      if (!rawUrl) continue;
      const decryptedUrl = decryptUrl(rawUrl);
      if (!decryptedUrl) continue;

      const subtitles: TextTracks = [];
      const subtitleItems = item.subtitles || data?.data?.subtitles || data?.subtitles;
      if (Array.isArray(subtitleItems)) {
        for (const sub of subtitleItems) {
          const rawSubUrl = sub.url || sub.file || sub.link;
          const subUrl = decryptUrl(rawSubUrl || "");
          if (subUrl) {
            subtitles.push({
              title: sub.label || sub.lang || sub.language || "Subtitle",
              language: sub.lang || sub.language || "en",
              type: subUrl.endsWith(".vtt") ? "text/vtt" : "application/x-subrip",
              uri: subUrl,
            });
          }
        }
      }

      const headers = {
        Referer: "https://kartoons.to/",
        "User-Agent": activeUa,
      };
      let resolved = [{link: decryptedUrl, quality: item.quality || "auto"}];
      if (/^https?:\/\/[^/]+\.workers\.dev\/playlist\//i.test(decryptedUrl)) {
        try {
          resolved = await resolveWorkerPlaylist(decryptedUrl, providerContext, headers, signal);
        } catch (error: any) {
          if (signal?.aborted) throw error;
          resolutionErrors.push(error.message || "Kartoons playlist resolution failed");
          continue;
        }
      }
      for (const source of resolved) streams.push({
        server: item.title || item.server || item.name || "Kartoons",
        link: source.link,
        type: /\.m3u8(?:[?#]|$)|\/playlist\//i.test(source.link) ? "m3u8" : "mp4",
        quality: source.quality === "auto" ? item.quality || "auto" : source.quality,
        headers,
        subtitles: subtitles.length > 0 ? subtitles : undefined,
      });
    }

    if (!streams.length && resolutionErrors.length) throw new Error(resolutionErrors.join("; "));
    return streams;
  } catch (error) {
    throwProviderError("Kartoons", "getStream", error);
  }
};
