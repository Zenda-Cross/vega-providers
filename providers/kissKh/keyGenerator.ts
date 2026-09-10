export interface KisskhConfig {
  viGuid: string;
  subGuid: string;
  appVer: string;
  platformVer: number;
  appName: string;
}

const DEFAULT_CONFIG: KisskhConfig = {
  viGuid: "62f176f3bb1b5b8e70e39932ad34a0c7",
  subGuid: "VgV52sWhwvBSf8BsM3BRY9weWiiCbtGp",
  appVer: "2.8.10",
  platformVer: 4830201,
  appName: "kisskh",
};

let cachedConfig: KisskhConfig = { ...DEFAULT_CONFIG };
let configFetchedAt = 0;
const CONFIG_CACHE_TTL = 3600 * 1000;

export async function getKisskhConfig(
  axios: any,
  baseUrl: string = "https://kisskh.is"
): Promise<KisskhConfig> {
  const now = Date.now();
  if (now - configFetchedAt < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const htmlRes = await axios.get(baseUrl, { timeout: 4000 });
    const html = typeof htmlRes.data === "string" ? htmlRes.data : "";
    const runtimeMatch = html.match(/src=["'](runtime\.[a-f0-9]+\.js)["']/i);
    if (!runtimeMatch) return DEFAULT_CONFIG;

    const runtimeRes = await axios.get(`${baseUrl}/${runtimeMatch[1]}`, {
      timeout: 4000,
    });
    const runtimeJs =
      typeof runtimeRes.data === "string" ? runtimeRes.data : "";
    const chunk502Match = runtimeJs.match(/502\s*:\s*["']([a-f0-9]+)["']/);
    if (!chunk502Match) return DEFAULT_CONFIG;

    const chunkUrl = `${baseUrl}/502.${chunk502Match[1]}.js`;
    const chunkRes = await axios.get(chunkUrl, { timeout: 4000 });
    const chunkJs = typeof chunkRes.data === "string" ? chunkRes.data : "";

    const viMatch = chunkJs.match(/viGuid\s*=\s*["']([^"']+)["']/);
    const subMatch = chunkJs.match(/subGuid\s*=\s*["']([^"']+)["']/);
    const appVerMatch = chunkJs.match(/appVer\s*=\s*["']([^"']+)["']/);
    const platMatch = chunkJs.match(/platformVer\s*=\s*([0-9]+)/);

    cachedConfig = {
      viGuid: viMatch ? viMatch[1] : DEFAULT_CONFIG.viGuid,
      subGuid: subMatch ? subMatch[1] : DEFAULT_CONFIG.subGuid,
      appVer: appVerMatch ? appVerMatch[1] : DEFAULT_CONFIG.appVer,
      platformVer: platMatch
        ? parseInt(platMatch[1], 10)
        : DEFAULT_CONFIG.platformVer,
      appName: DEFAULT_CONFIG.appName,
    };
    configFetchedAt = now;
    return cachedConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function toWords(str: string): [number[], number] {
  const len = str.length;
  const words: number[] = [];
  for (let i = 0; i < len; i++) {
    words[i >>> 2] |= (0xff & str.charCodeAt(i)) << (24 - (i % 4) * 8);
  }
  return [words, len];
}

function wordsToHex(words: number[], sigBytes: number): string {
  const res: string[] = [];
  for (let i = 0; i < sigBytes; i++) {
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    res.push(byte.toString(16).padStart(2, "0"));
  }
  return res.join("");
}

function substr48(s: string): string {
  return (s || "").substring(0, 48);
}

function stringHash(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
  }
  return hash;
}

function pkcs7Pad(s: string): string {
  const pad = 16 - (s.length % 16);
  for (let i = 0; i < pad; ++i) {
    s += String.fromCharCode(pad);
  }
  return s;
}

const roundKeys = [
  0x4f6bdaa3, -0x61d07350, 0x7f5e722d, -0x61210cec, 0x536620a8, -0x32b653e8,
  -0x4de821cb, 0x2cc92d21, -0x73412227, 0x41f771c1, -0xc1f500c, -0x20d67d2b,
  0x2dadde47, 0x6c5aaf86, -0x6045ff8e, 0x409382a7, -0x6417db2, -0x6a1bd238,
  0xa5e2dba, 0x4acdaf1d, 0x54c72698, -0x3edcf4b0, -0x3482d916, -0x7e4f7609,
  -0x6c9fb16c, 0x524345c4, -0x66c19cd2, 0x188eead9, -0x351884c7, -0x675bc103,
  0x19a5dd3, 0x1914b70a, -0x4fb1e313, 0x28ea2210, 0x29707fc3, 0x3064c8c9,
  -0x17593e17, -0x3fb31c07, -0x16c363c6, -0x26a7ab0d, -0x4b793324, 0x74ca2f25,
  -0x62094ce1, 0x44aee7ec,
];

const tables: number[][] = [roundKeys];

(function initTables() {
  const sbox: number[] = [];
  const t0: number[] = [];
  const t1: number[] = [];
  const t2: number[] = [];
  const t3: number[] = [];
  const d: number[] = [];

  for (let i = 0; i < 256; i++) {
    d[i] = i < 128 ? i << 1 : (i << 1) ^ 0x11b;
  }

  let x = 0;
  let xi = 0;
  for (let i = 0; i < 256; i++) {
    let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
    sx = (sx >>> 8) ^ (0xff & sx) ^ 0x63;
    sbox[x] = sx;

    const d_x = d[x];
    const d_d_x = d[d[d_x]];
    const m = (0x101 * d[sx]) ^ (0x1010100 * sx);

    t0[x] = (m << 24) | (m >>> 8);
    t1[x] = (m << 16) | (m >>> 16);
    t2[x] = (m << 8) | (m >>> 24);
    t3[x] = m;

    if (x) {
      x = d_x ^ d[d[d[d_d_x ^ d_x]]];
      xi ^= d[d[xi]];
    } else {
      x = xi = 1;
    }
  }

  tables.push(t0, t1, t2, t3, sbox);
})();

function encryptBlock(words: number[], offset: number) {
  const [rk, t0, t1, t2, t3, sbox] = tables;
  let iv: number[];
  if (offset === 0) {
    iv = [0x1504af3, 0x56e619cf, 0x2e42bba6, -0x73c08f07];
  } else {
    iv = words.slice(offset - 4, offset);
  }

  for (let i = 0; i < 4; i++) {
    words[offset + i] ^= iv[i];
  }

  let s0 = words[offset] ^ rk[0];
  let s1 = words[offset + 1] ^ rk[1];
  let s2 = words[offset + 2] ^ rk[2];
  let s3 = words[offset + 3] ^ rk[3];
  let keyIdx = 4;

  for (let round = 1; round < 10; round++) {
    const a0 =
      t0[s0 >>> 24] ^
      t1[(s1 >>> 16) & 0xff] ^
      t2[(s2 >>> 8) & 0xff] ^
      t3[s3 & 0xff] ^
      rk[keyIdx++];
    const a1 =
      t0[s1 >>> 24] ^
      t1[(s2 >>> 16) & 0xff] ^
      t2[(s3 >>> 8) & 0xff] ^
      t3[s0 & 0xff] ^
      rk[keyIdx++];
    const a2 =
      t0[s2 >>> 24] ^
      t1[(s3 >>> 16) & 0xff] ^
      t2[(s0 >>> 8) & 0xff] ^
      t3[s1 & 0xff] ^
      rk[keyIdx++];
    const a3 =
      t0[s3 >>> 24] ^
      t1[(s0 >>> 16) & 0xff] ^
      t2[(s1 >>> 8) & 0xff] ^
      t3[s2 & 0xff] ^
      rk[keyIdx++];
    s0 = a0;
    s1 = a1;
    s2 = a2;
    s3 = a3;
  }

  const o0 =
    ((sbox[s0 >>> 24] << 24) |
      (sbox[(s1 >>> 16) & 0xff] << 16) |
      (sbox[(s2 >>> 8) & 0xff] << 8) |
      sbox[s3 & 0xff]) ^
    rk[keyIdx++];
  const o1 =
    ((sbox[s1 >>> 24] << 24) |
      (sbox[(s2 >>> 16) & 0xff] << 16) |
      (sbox[(s3 >>> 8) & 0xff] << 8) |
      sbox[s0 & 0xff]) ^
    rk[keyIdx++];
  const o2 =
    ((sbox[s2 >>> 24] << 24) |
      (sbox[(s3 >>> 16) & 0xff] << 16) |
      (sbox[(s0 >>> 8) & 0xff] << 8) |
      sbox[s1 & 0xff]) ^
    rk[keyIdx++];
  const o3 =
    ((sbox[s3 >>> 24] << 24) |
      (sbox[(s0 >>> 16) & 0xff] << 16) |
      (sbox[(s1 >>> 8) & 0xff] << 8) |
      sbox[s2 & 0xff]) ^
    rk[keyIdx++];

  words[offset] = o0;
  words[offset + 1] = o1;
  words[offset + 2] = o2;
  words[offset + 3] = o3;
}

export function generateKisskhKey(
  episodeId: string | number,
  guid: string,
  appVer: string = DEFAULT_CONFIG.appVer,
  platformVer: number = DEFAULT_CONFIG.platformVer,
  appName: string = DEFAULT_CONFIG.appName
): string {
  const parts: any[] = [
    "",
    episodeId,
    null,
    "mg3c3b04ba",
    appVer,
    guid,
    platformVer,
    substr48(appName),
    substr48(appName.toLowerCase()),
    substr48(appName),
    appName,
    appName,
    appName,
    "00",
    "",
  ];

  const initialJoin = parts.join("|");
  const hash = stringHash(initialJoin);
  parts.splice(1, 0, hash);

  const paddedStr = pkcs7Pad(parts.join("|"));
  const [words, sigBytes] = toWords(paddedStr);

  for (let offset = 0; offset < words.length; offset += 4) {
    encryptBlock(words, offset);
  }

  return wordsToHex(words, sigBytes).toUpperCase();
}
