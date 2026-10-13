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

function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof crypto !== "undefined" && crypto && crypto.subtle) {
    return crypto.subtle;
  }
  if (
    typeof globalThis !== "undefined" &&
    globalThis &&
    globalThis.crypto?.subtle
  ) {
    return globalThis.crypto.subtle;
  }
  if (typeof self !== "undefined" && self && self.crypto?.subtle) {
    return self.crypto.subtle;
  }
  try {
    const g = Function("return this")();
    if (g && g.crypto && g.crypto.subtle) {
      return g.crypto.subtle;
    }
  } catch {}
  return null;
}

export async function decryptVidbasicAes(
  ciphertextB64: string,
  keyStr = DEFAULT_KEY,
  ivStr = DEFAULT_IV
): Promise<string> {
  try {
    if (!ciphertextB64) return "";

    const subtle = getSubtleCrypto();
    if (!subtle) return "";

    const keyBytes = new TextEncoder().encode(keyStr);
    const ivBytes = new TextEncoder().encode(ivStr);
    const cipherBytes = base64ToUint8Array(ciphertextB64);

    const cryptoKey = await subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decryptedBuf = await subtle.decrypt(
      { name: "AES-CBC", iv: ivBytes },
      cryptoKey,
      cipherBytes
    );

    return new TextDecoder().decode(decryptedBuf);
  } catch {
    return "";
  }
}
