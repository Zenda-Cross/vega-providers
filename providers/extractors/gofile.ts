const GOFILE_API = "https://api.gofile.io";
const GOFILE_LANGUAGE = "en-US";
const GOFILE_WEBSITE_SECRET = "9844d94d963d30";
const GOFILE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0";

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
];

type GofileContent = {
  type?: string;
  link?: string;
  children?: Record<string, GofileContent>;
};

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function encodeUtf8(value: string): number[] {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0)!;

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return bytes;
}

function sha256(value: string): string {
  const bytes = encodeUtf8(value);
  const bitLength = bytes.length * 8;
  const hash = [...INITIAL_HASH];

  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push(highBits >>> shift);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push(lowBits >>> shift);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(64);

    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      words[index] =
        (bytes[position] << 24) |
        (bytes[position + 1] << 16) |
        (bytes[position + 2] << 8) |
        bytes[position + 3];
    }

    for (let index = 16; index < 64; index += 1) {
      const first = words[index - 15];
      const second = words[index - 2];
      const sigma0 =
        rotateRight(first, 7) ^ rotateRight(first, 18) ^ (first >>> 3);
      const sigma1 =
        rotateRight(second, 17) ^ rotateRight(second, 19) ^ (second >>> 10);
      words[index] =
        (words[index - 16] + sigma0 + words[index - 7] + sigma1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 =
        (h + sum1 + choice + SHA256_CONSTANTS[index] + words[index]) | 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  return hash
    .map((word) => (word >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function generateWebsiteToken(accountToken: string, now = Date.now()): string {
  const timeBucket = Math.floor(now / 1000 / 14400);
  return sha256(
    [
      GOFILE_USER_AGENT,
      GOFILE_LANGUAGE,
      accountToken,
      timeBucket,
      GOFILE_WEBSITE_SECRET,
    ].join("::"),
  );
}

function findFirstFile(content: GofileContent): GofileContent | undefined {
  if (content.type === "file" && content.link) return content;

  for (const child of Object.values(content.children ?? {})) {
    const file = findFirstFile(child);
    if (file) return file;
  }

  return undefined;
}

export async function gofileExtractor(
  id: string,
  axios: any,
): Promise<{ link: string; token: string }> {
  try {
    const accountResponse = await axios.post(`${GOFILE_API}/accounts`);
    const token = accountResponse.data?.data?.token;

    if (!token) throw new Error("Gofile did not return an account token");

    const response = await axios.get(`${GOFILE_API}/contents/${id}`, {
      params: {
        contentFilter: "",
        page: 1,
        pageSize: 1000,
        sortField: "name",
        sortDirection: 1,
      },
      headers: {
        Accept: "*/*",
        "Accept-Language": `${GOFILE_LANGUAGE},en;q=0.9`,
        Authorization: `Bearer ${token}`,
        Origin: "https://gofile.io",
        Referer: "https://gofile.io/",
        "User-Agent": GOFILE_USER_AGENT,
        "X-BL": GOFILE_LANGUAGE,
        "X-Website-Token": generateWebsiteToken(token),
      },
    });

    if (response.data?.status !== "ok") {
      throw new Error(
        `Gofile API returned ${response.data?.status ?? "invalid data"}`,
      );
    }

    const file = findFirstFile(response.data.data);
    if (!file?.link) throw new Error("No downloadable file found");

    return { link: file.link, token };
  } catch (error) {
    console.error("gofileExtractor error", error);
    return { link: "", token: "" };
  }
}

export { generateWebsiteToken, sha256 };
