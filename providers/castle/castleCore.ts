import { ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

/* ================================================================== */
/* Constants                                                          */
/* ================================================================== */
const DEFAULT_API = "https://api.hlowb.com";
const CHANNEL     = "IndiaA";
const CLIENT_TYPE = "1";
const LANG        = "en-US";
const MODE        = "1";
const PACKAGE     = "com.external.castle";
const APP_MARKET  = "GuanWang";
const APK_SIGN    = "ED0955EB04E67A1D9F3305B95454FED485261475";
const ANDROID_VER = "13";
const LOCATION_ID = "1001";
const UA          = "okhttp/4.9.0";
const SUFFIX      = "T!BgJB";

export const SERIES_TYPES = new Set(["1", "3", "5"]);
export const QUALITY_NAME: Record<string, string> = { "3": "1080p", "2": "720p", "1": "480p" };
export const QUALITY_NUM:  Record<string, number> = { "3": 1080,   "2": 720,   "1": 480 };
export const RESOLUTIONS = ["3", "2", "1"];

async function getApiBase(): Promise<string> {
  try {
    const url = await getBaseUrl("castle");
    return url || DEFAULT_API;
  } catch {
    return DEFAULT_API;
  }
}

/* ================================================================== */
/* Pure JS AES-128-CBC Decryption (Zero dependencies / Sandbox safe)   */
/* ================================================================== */
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

function aes128KeyExpansion(keyBytes: Uint8Array): Uint32Array {
  const w = new Uint32Array(44);
  for (let i = 0; i < 4; i++) {
    w[i] = (keyBytes[4 * i] << 24) | (keyBytes[4 * i + 1] << 16) | (keyBytes[4 * i + 2] << 8) | keyBytes[4 * i + 3];
  }
  for (let i = 4; i < 44; i++) {
    let temp = w[i - 1];
    if (i % 4 === 0) {
      temp = (temp << 8) | (temp >>> 24);
      temp =
        (AES_SBOX[(temp >>> 24) & 0xff] << 24) |
        (AES_SBOX[(temp >>> 16) & 0xff] << 16) |
        (AES_SBOX[(temp >>> 8) & 0xff] << 8) |
        AES_SBOX[temp & 0xff];
      temp ^= AES_RCON[i / 4] << 24;
    }
    w[i] = w[i - 4] ^ temp;
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
    const a = s[i], b = s[i + 1], d = s[i + 2], e = s[i + 3];
    s[i] = aesMul(0x0e, a) ^ aesMul(0x0b, b) ^ aesMul(0x0d, d) ^ aesMul(0x09, e);
    s[i + 1] = aesMul(0x09, a) ^ aesMul(0x0e, b) ^ aesMul(0x0b, d) ^ aesMul(0x0d, e);
    s[i + 2] = aesMul(0x0d, a) ^ aesMul(0x09, b) ^ aesMul(0x0e, d) ^ aesMul(0x0b, e);
    s[i + 3] = aesMul(0x0b, a) ^ aesMul(0x0d, b) ^ aesMul(0x09, d) ^ aesMul(0x0e, e);
  }
}

function aesDecryptBlock128(block: Uint8Array, w: Uint32Array): Uint8Array {
  const state = new Uint8Array(block);
  const Nr = 10;
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

function aes128CbcDecrypt(cipherBytes: Uint8Array, keyBytes: Uint8Array, ivBytes: Uint8Array): Uint8Array {
  const w = aes128KeyExpansion(keyBytes);
  const out = new Uint8Array(cipherBytes.length);
  let prev = ivBytes;
  for (let offset = 0; offset < cipherBytes.length; offset += 16) {
    const block = cipherBytes.subarray(offset, offset + 16);
    const decrypted = aesDecryptBlock128(block, w);
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

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "utf8"));
  }
  const escaped = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(escaped.length);
  for (let i = 0; i < escaped.length; i++) {
    bytes[i] = escaped.charCodeAt(i);
  }
  return bytes;
}

function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("utf8");
  }
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(str));
}

/** AES-128 key = decode_b64(securityKey) + "T!BgJB", padded/truncated to 16 bytes. */
export function deriveKey(securityKeyB64: string): Uint8Array {
  const decBytes = base64ToBytes(securityKeyB64);
  const suffixBytes = utf8ToBytes(SUFFIX);
  const key = new Uint8Array(16);
  let idx = 0;
  for (let i = 0; i < decBytes.length && idx < 16; i++) {
    key[idx++] = decBytes[i];
  }
  for (let i = 0; i < suffixBytes.length && idx < 16; i++) {
    key[idx++] = suffixBytes[i];
  }
  return key;
}

/** Decrypt an AES-128-CBC / PKCS7 base64 payload. Returns the UTF-8 plaintext. */
export function decryptCBC(cipherB64: string, key: Uint8Array): string {
  const cipherBytes = base64ToBytes(cipherB64);
  const plainBytes = aes128CbcDecrypt(cipherBytes, key, key);
  const text = bytesToUtf8(plainBytes);
  if (!text) {
    throw new Error("CastleTV: AES decrypt produced empty output");
  }
  return text;
}

/** Wraps 16+ digit IDs in quotes so JSON.parse doesn’t lose precision. */
export function castleSafeParse(text: string): any {
  const cleaned = String(text).replace(
    /"([A-Za-z0-9_]*Id|id)"\s*:\s*(-?\d+)/g,
    '"$1":"$2"'
  );
  return JSON.parse(cleaned);
}

/* ================================================================== */
/* Security key cache                                                 */
/* ================================================================== */
let cachedKey: Uint8Array | null = null;
let cachedKeyAt = 0;
const KEY_TTL = 5 * 60 * 1000;

async function getSecurityKey(ctx: ProviderContext): Promise<Uint8Array> {
  const now = Date.now();
  if (cachedKey && now - cachedKeyAt < KEY_TTL) return cachedKey;

  const base = await getApiBase();
  const url = `${base}/v0.1/system/getSecurityKey/1?channel=${CHANNEL}&clientType=${CLIENT_TYPE}&lang=${LANG}`;
  const res = await ctx.axios.get(url, { headers: { "User-Agent": UA } });
  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (!data || data.code !== 200 || !data.data) {
    throw new Error("CastleTV: failed to fetch security key");
  }
  cachedKey   = deriveKey(data.data);
  cachedKeyAt = now;
  return cachedKey;
}

/* ================================================================== */
/* HTTP + envelope unwrapping                                         */
/* ================================================================== */
function extractCipher(body: any): string {
  try {
    const j = typeof body === "string" ? JSON.parse(body) : body;
    if (j && typeof j.data === "string") return j.data;
  } catch { /* raw body */ }
  return String(body).trim();
}

async function unwrap(body: any, key: Uint8Array): Promise<any> {
  try {
    const j = typeof body === "string" ? JSON.parse(body) : body;
    if (j && typeof j === "object" && j.data && typeof j.data === "object") return j;
  } catch { /* ignore */ }

  const cipher = extractCipher(body);
  try {
    const d = JSON.parse(cipher);
    if (d && typeof d === "object") return d;
  } catch { /* ignore */ }

  const plain = decryptCBC(cipher, key);
  return castleSafeParse(plain);
}

export async function fetchDecrypted(url: string, ctx: ProviderContext, signal?: AbortSignal): Promise<any> {
  const key = await getSecurityKey(ctx);
  const res = await ctx.axios.get(url, {
    headers: { "User-Agent": UA },
    ...(signal ? { signal } : {}),
  });
  return unwrap(res.data, key);
}

export async function postDecrypted(url: string, body: any, ctx: ProviderContext, signal?: AbortSignal): Promise<any> {
  const key = await getSecurityKey(ctx);
  const res = await ctx.axios.post(url, body, {
    headers: { "User-Agent": UA, "Content-Type": "application/json; charset=utf-8" },
    ...(signal ? { signal } : {}),
  });
  return unwrap(res.data, key);
}

/* ================================================================== */
/* Envelope helpers                                                   */
/* ================================================================== */
export function pickDetails(env: any): any {
  const outer = env?.data;
  if (!outer || typeof outer !== "object") return {};
  const inner = outer.data;
  if (inner && typeof inner === "object" &&
      (inner.title || inner.episodes || inner.seasons || inner.id)) {
    return inner;
  }
  return outer;
}

export function pickRows(env: any): any[] {
  const d = env?.data;
  if (!d) return [];
  if (Array.isArray(d.rows)) return d.rows;
  if (Array.isArray(d.data?.rows)) return d.data.rows;
  return [];
}

/* ================================================================== */
/* API wrappers                                                       */
/* ================================================================== */
export async function apiHome(page: number, ctx: ProviderContext, signal?: AbortSignal) {
  const base = await getApiBase();
  const url = `${base}/film-api/v0.1/category/home?channel=${CHANNEL}&clientType=${CLIENT_TYPE}&clientType=${CLIENT_TYPE}&lang=${LANG}&locationId=${LOCATION_ID}&mode=${MODE}&packageName=${PACKAGE}&page=${page}&size=30`;
  return fetchDecrypted(url, ctx, signal);
}

export async function apiSearch(query: string, page: number, ctx: ProviderContext, signal?: AbortSignal) {
  const base = await getApiBase();
  const url = `${base}/film-api/v1.1.0/movie/searchByKeyword?channel=${CHANNEL}&clientType=${CLIENT_TYPE}&clientType=${CLIENT_TYPE}&keyword=${encodeURIComponent(query)}&lang=${LANG}&mode=${MODE}&packageName=${PACKAGE}&page=${page}&size=30`;
  return fetchDecrypted(url, ctx, signal);
}

export async function apiMovieDetails(movieId: string | number, ctx: ProviderContext, signal?: AbortSignal) {
  const base = await getApiBase();
  const url = `${base}/film-api/v1.9.9/movie?channel=${CHANNEL}&clientType=${CLIENT_TYPE}&clientType=${CLIENT_TYPE}&lang=${LANG}&movieId=${encodeURIComponent(String(movieId))}&packageName=${PACKAGE}`;
  return fetchDecrypted(url, ctx, signal);
}

export async function apiVideoUrl(
  movieId: string | number,
  episodeId: string | number,
  resolution: string,
  languageId: string | number | null,
  ctx: ProviderContext,
  signal?: AbortSignal,
) {
  const base = await getApiBase();
  const url = `${base}/film-api/v2.0.1/movie/getVideo2?clientType=${CLIENT_TYPE}&packageName=${PACKAGE}&channel=${CHANNEL}&lang=${LANG}`;
  const body: any = {
    mode: MODE,
    appMarket: APP_MARKET,
    clientType: CLIENT_TYPE,
    woolUser: "false",
    apkSignKey: APK_SIGN,
    androidVersion: ANDROID_VER,
    movieId: String(movieId),
    episodeId: String(episodeId),
    isNewUser: "true",
    resolution: String(resolution),
    packageName: PACKAGE,
  };
  if (languageId != null && languageId !== "") body.languageId = String(languageId);
  return postDecrypted(url, body, ctx, signal);
}

/* ================================================================== */
/* URL scheme                                                         */
/* ================================================================== */
export function mediaLink(id: string | number) {
  return `castle://media/${encodeURIComponent(String(id))}`;
}

export function seasonLink(movieId: string | number) {
  return `castle://season/${encodeURIComponent(String(movieId))}`;
}

export function playLink(movieId: string | number, episodeId: string | number) {
  return `castle://play/${encodeURIComponent(String(movieId))}_${encodeURIComponent(String(episodeId))}`;
}

export function parseMediaLink(link: string): string {
  const raw = String(link || "").trim();
  if (raw.startsWith("castle://media/")) return decodeURIComponent(raw.substring("castle://media/".length));
  const tail = raw.substring(raw.lastIndexOf("/") + 1);
  return tail || raw;
}

export function parseSeasonLink(link: string): string {
  const raw = String(link || "").trim();
  if (raw.startsWith("castle://season/")) return decodeURIComponent(raw.substring("castle://season/".length));
  return raw;
}

export function parsePlayLink(link: string): { movieId: string; episodeId: string } {
  const raw = String(link || "").trim();
  let payload = raw;
  if (raw.startsWith("castle://play/")) payload = decodeURIComponent(raw.substring("castle://play/".length));
  const idx = payload.indexOf("_");
  if (idx === -1) return { movieId: payload, episodeId: "" };
  return { movieId: payload.substring(0, idx), episodeId: payload.substring(idx + 1) };
}
