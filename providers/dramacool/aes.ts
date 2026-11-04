const DEFAULT_KEY = "94588293375053432799222445521289";
const DEFAULT_IV = "5259228356829423";

const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const clean = base64
    .replace(/[\r\n\s]/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  if (typeof atob !== "undefined") {
    try {
      const pad = clean.padEnd(4 * Math.ceil(clean.length / 4), "=");
      const bin = atob(pad);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    } catch {}
  }

  const len = clean.length;
  let validLen = len;
  if (clean.endsWith("==")) validLen -= 2;
  else if (clean.endsWith("=")) validLen -= 1;
  const byteLen = Math.floor((validLen * 3) / 4);
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const b0 = B64_LOOKUP[clean.charCodeAt(i)];
    const b1 = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const b2 =
      clean.charAt(i + 2) === "=" ? 0 : B64_LOOKUP[clean.charCodeAt(i + 2)];
    const b3 =
      clean.charAt(i + 3) === "=" ? 0 : B64_LOOKUP[clean.charCodeAt(i + 3)];
    if (p < byteLen) bytes[p++] = (b0 << 2) | (b1 >> 4);
    if (p < byteLen) bytes[p++] = ((b1 & 15) << 4) | (b2 >> 2);
    if (p < byteLen) bytes[p++] = ((b2 & 3) << 6) | b3;
  }
  return bytes;
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
  if (pad < 1 || pad > 16) throw new Error("Invalid DramaCool URL padding");
  for (let i = out.length - pad; i < out.length; i++) {
    if (out[i] !== pad) throw new Error("Invalid DramaCool URL padding");
  }
  return out.subarray(0, out.length - pad);
}


export async function decryptVidbasicAes(
  ciphertextB64: string,
  keyStr = DEFAULT_KEY,
  ivStr = DEFAULT_IV
): Promise<string> {
  try {
    if (!ciphertextB64) return "";

    const keyBytes = utf8Bytes(keyStr);
    const ivBytes = utf8Bytes(ivStr);
    const cipherBytes = base64ToUint8Array(ciphertextB64);
    if (keyBytes.length !== 32 || ivBytes.length !== 16 || !cipherBytes.length || cipherBytes.length % 16) return "";
    const plain = aesDecryptCbcPureJs(cipherBytes, keyBytes, ivBytes);
    const chunks: string[] = [];
    for (let i = 0; i < plain.length; i += 8192) {
      chunks.push(String.fromCharCode.apply(null, Array.from(plain.subarray(i, i + 8192))));
    }
    return decodeURIComponent(escape(chunks.join("")));
  } catch {
    return "";
  }
}

function utf8Bytes(text: string): Uint8Array {
  const binary = unescape(encodeURIComponent(text));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
