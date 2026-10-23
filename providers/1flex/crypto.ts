// Vidzee & Viduki WASM Cryptography and Stream Decryptors

// --- VIDZEE DECRYPTOR ---
async function f(w: any, g: any = {}) {
  const Y = {
    env: Object.setPrototypeOf(
      {
        abort(A: any, B: any, C: any, I: any) {
          A = H(A >>> 0);
          B = H(B >>> 0);
          C = C >>> 0;
          I = I >>> 0;
          (() => {
            throw Error(`${A} in ${B}:${C}:${I}`);
          })();
        },
      },
      Object.assign({}, g.env || {})
    ),
  };
  const { exports: Q }: any = await WebAssembly.instantiate(w, Y);
  const E = Q.memory || g.env.memory;
  const o = Object.setPrototypeOf(
    {
      decrypt(A: any, B: any) {
        A = n(e(Uint8Array, 6, 0, A) || K());
        B = i(B) || K();
        try {
          return F(Uint8Array, Q.decrypt(A, B) >>> 0);
        } finally {
          c(A);
        }
      },
    },
    Q
  );

  function H(A: any) {
    if (!A) return null;
    const B = A + new Uint32Array(E.buffer)[(A - 4) >>> 2] >>> 1;
    const C = new Uint16Array(E.buffer);
    let I = A >>> 1;
    let G = "";
    for (; B - I > 1024; ) {
      G += String.fromCharCode(...C.subarray(I, (I += 1024)));
    }
    return G + String.fromCharCode(...C.subarray(I, B));
  }

  function i(A: any) {
    if (A == null) return 0;
    const B = A.length;
    const C = (Q.__new(B << 1, 2) >>> 0) as number;
    const I = new Uint16Array(E.buffer);
    for (let G = 0; G < B; ++G) I[(C >>> 1) + G] = A.charCodeAt(G);
    return C;
  }

  function F(A: any, B: any) {
    return B ? new A(E.buffer, U(B + 4), s.getUint32(B + 8, !0) / A.BYTES_PER_ELEMENT).slice() : null;
  }

  function e(A: any, B: any, C: any, I: any) {
    if (I == null) return 0;
    const G = I.length;
    const y = (Q.__pin(Q.__new(G << C, 1)) >>> 0) as number;
    const D = (Q.__new(12, B) >>> 0) as number;
    return (
      L(D + 0, y),
      s.setUint32(D + 4, y, !0),
      s.setUint32(D + 8, G << C, !0),
      new A(E.buffer, y, G).set(I),
      Q.__unpin(y),
      D
    );
  }

  const r = new Map();
  function n(A: any) {
    if (A) {
      const B = r.get(A);
      B ? r.set(A, B + 1) : r.set(Q.__pin(A), 1);
    }
    return A;
  }

  function c(A: any) {
    if (A) {
      const B = r.get(A);
      if (B === 1) Q.__unpin(A), r.delete(A);
      else if (B) r.set(A, B - 1);
      else throw Error(`invalid refcount '${B}' for reference '${A}'`);
    }
  }

  function K() {
    throw TypeError("value must not be null");
  }

  let s = new DataView(E.buffer);
  function L(A: any, B: any) {
    try {
      s.setUint32(A, B, !0);
    } catch {
      s = new DataView(E.buffer);
      s.setUint32(A, B, !0);
    }
  }

  function U(A: any) {
    try {
      return s.getUint32(A, !0);
    } catch {
      s = new DataView(E.buffer);
      return s.getUint32(A, !0);
    }
  }

  return o;
}

const R = "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////////////////////////////9/D/////////////////////////////////7/////8BAwAAAB8AQZwrC0ogAAAAAADPvEDX///7////////////v///////////////////////A/z///////////////////////////7///9/AP//////AQBBiCwLDP////+/IP//////5wBBqCwLDP////////////8/PwBBxCwLUP8B///////nAAAAAAAAAAD///////////////////////////////8AAAAAAAAAAP//Pz//////Pz//qv///z/////////fX9wfzw//H9wfAEGiLQsGAoAAAP8fAEG0LQsRhPwvPlC9H/LgQwAA/////xgAQeotCzDA////////AwAA//////9///////9//////////////////////x94DAD/////vyAAQbwuCwz//////z8AAP///z8AQdguCz/8////////////////eP////////wHAAAAAGAHAAAAAAAA///////3/wH/////////////AAAAAAAAAAB/APgAQbgvCwj+//8H/v//BwBB1C8LCv////////////8AQeovCwr/////D/////8PAEGEMAsP////////BwD///////8HAEGoMAsI//////////8AQbwwCwj//////////wBB1DALiQH/////////////3///////////32Te/+vv/////////7/n39////97X/z9//////////////////////////////////////////////////////8//////f//9/////f//9/////f//9/////f/////3////9///3DwAAAAAAAP//////////DwBB+jELDP///wP///8D////AwBBlDILgAQHCAkKCwwGBgYGBgYGBgYGDQYGDgYGBgYGBgYGDxAREgYTBgYGBgYGBgYGBhQVBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGFhcGBgYYBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYZBgYGBhoGBgYGBgYGGwYGBgYGBgYGBgYGHAYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYdBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYeBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgBBgzcLFCQrKysrKysrKwEAVFZWVlZWVlZWAEGqNwufAxgAAAArKysrKysrBysrW1ZWVlZWVlZKVlYFMVAxUDFQMVAxUDFQMVAxUCRQeTFQMVAxOFAxUDFQMVAxUDFQMVAxUE4xAk4NDU4DTgAkbgBOMSZuUU4kUE45FIEbHR1TMVAxUA0xUDFQMVAbUyRQMQJce1x7XHtce1x7FHlce1x7XC0rSQNIA3hcexQAlgoBKygGBgAqBioqKwe7tSseACsHKysrASsrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrASsrKysrKysrKysrKysrKysrKysrKysrKisrKysrKysrKysrKyvNRs0rACUrBwEGAVVWVlZWVlVWVgIkgYGBgYEVgYGBAAArALLRstGy0bLRAADNzAEA19fX19eDgYGBgYGBgYGBgaysrKysrKysrKwcAAAAAAAxUDFQMVAxUDFQMQIAADFQMVAxUDFQMVAxUDFQMVAxUE4xUDFQTjFQMVAxUDFQMVAxUDFQMQKHpoemh6aHpoemh6aHpoemKisrKysrKysrKysrKwAAAFRWVlZWVlZWVlZWVlYAQac7CyFUVlZWVlZWVlZWVlZWDAAMKisrKysrKysrKysrKysHKgEAQf07C3cqKysrKysrKysrKysrKysrKysrKysrKysrKytWVmyBFQArKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysHbANBKytWVlZWVlZWVlZWVlZWVixWKysrKysrKysrKysrKysrKysrKysrAQBBnD0LCAxsAAAAAAAGAEHKPQvoAgYlBiUGJQYlBiUGJQYlBiUGJQYlBiUGJQYlBiUGJQYlBiUGJQYlBiUGJQYlVnqeJgYlBiUGJQYlBiUGJQYlBiUGJQYlBiUGJQYlBiUGJQYBKytPVlYsK39WVjkrK1VWVisrT1ZWLCt/VlaBN3Vbe1wrK09WVgKsBAAAOSsrVVZWKytPVlYsKytWVjITgVcAb4F+ydd+LYGBDn45f29XAIGBfhUAfgMrKysrKysrKysrKysHKyQrlysrKysrKysrKyorKysrK1ZWVlZWgIGBgYE5uyorKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrAYGBgYGBgYGBgYGBgYGBgcmsrKysrKysrKysrKysrKzQDQBOMQK0wcHX1yRQMVAxUDFQMVAxUDFQMVAxUDFQMVAxUDFQMVAxUDFQMVDX11PBR9TX19cFKysrKysrKysrKysrBwEAAQBBjcEACx9OMVAxUDFQMVAxUDFQMVANAAAAAAAkUDFQMVAxUDFQAEHOwQALVisrKysrKysrKysreVx7XHtPe1x7XHtce1x7XHtce1x7XHtce1wtKyt5FFx7XC15KlwnXHtce1x7pAAKtFx7XHtPA3g4KysrKysrKysrKysrK08tKysBAEG/wgALAUgAQcnCAAsbKisrKysrKysrKysrKysrKysrKysrKysrKysrAEGFwwALFCsrKysrKysrBwBIVlZWVlZWVlYCAEHQwwALGysrKysrKysrKysrKytVVlZWVlZWVlZWVlZWDgBBisQACxokKysrKysrKysrKysHAFZWVlZWVlZWVlZWVgBB0MQACyckKysrKysrKysrKysrKysrKwcAAAAAVlZWVlZWVlZWVlZWVlZWVlYAQbHFAAsWKisrKysrKysrKytWVlZWVlZWVlZWDgBB58UACxYqKysrKysrKysrK1ZWVlZWVlZWVlYOAEGoxgALFysrKysrKysrKysrVVZWVlZWVlZWVlYOAEGBxwALCAgAAFYBAAA5AEGQxwALvAcBIAAAAOD//wC/HQAA5wIAAHkAAAIkAAABAQAAAP///wAAAAABAgAAAP7//wE5//8AGP//AYf//wDU/v8AwwAAAdIAAAHOAAABzQAAAU8AAAHKAAABywAAAc8AAABhAAAB0wAAAdEAAACjAAAB1QAAAIIAAAHWAAAB2gAAAdkAAAHbAAAAOAAAAwAAAACx//8Bn///Acj//wIoJAAAAAAAAQEAAAD///8AM///ACb//wF+//8BKyoAAV3//wEoKgAAPyoAAT3//wFFAAABRwAAAB8qAAAcKgAAHioAAC7//wAy//8ANv//ADX//wBPpQAAS6UAADH//wAopQAARKUAAC///wAt//8A9ykAAEGlAAD9KQAAK///ACr//wDnKQAAQ6UAACqlAAC7//8AJ///ALn//wAl//8AFaUAABKlAAIkTAAAAAAAASAAAADg//8BAQAAAP///wBUAAABdAAAASYAAAElAAABQAAAAT8AAADa//8A2///AOH//wDA//8Awf//AQgAAADC//8Ax///ANH//wDK//8A+P//AKr//wCw//8ABwAAAIz//wHE//8AoP//Afn//wIacAABAQAAAP///wEgAAAA4P//AVAAAAEPAAAA8f//AAAAAAEwAAAA0P//AQEAAAD///8AAAAAAMALAAFgHAAAAAAAAdCXAAEIAAAA+P//AgWKAAAAAAABQPT/AJ7n/wDCiQAA2+f/AJLn/wCT5/8AnOf/AJ3n/wCk5/8AAAAAADiKAAAEigAA5g4AAQEAAAD///8AAAAAAMX//wFB4v8CHY8AAAgAAAH4//8AAAAAAFYAAAGq//8ASgAAAGQAAACAAAAAcAAAAH4AAAAJAAABtv//Aff//wDb4/8BnP//AZD//wGA//8Bgv//AgWsAAAAAAABEAAAAPD//wEcAAABAQAAAaPi/wFB3/8But//AOT//wILsQABAQAAAP///wEwAAAA0P//AAAAAAEJ1v8BGvH/ARnW/wDV1f8A2NX/AeTV/wED1v8B4dX/AeLV/wHB1f8AAAAAAKDj/wAAAAABAQAAAP///wIMvAAAAAAAAQEAAAD///8BvFr/AaADAAH8df8B2Fr/ADAAAAGxWv8BtVr/Ab9a/wHuWv8B1lr/Aeta/wHQ//8BvVr/Ach1/wAAAAAAMGj/AGD8/wAAAAABIAAAAOD//wAAAAABKAAAANj//wAAAAABQAAAAMD//wAAAAABIAAAAOD//wAAAAABIAAAAOD//wAAAAABIgAAAN7//wBBzc4ACwUGJ1FvdwBB3M4ACxJ8AAB/AAAAAAAAAACDjpKXAKoAQfjOAAsCtMQAQfLPAAsGxskAAADbAEHL0AALDt4AAAAA4QAAAAAAAADkAEHk0AALAecAQbrRAAsB6gBBtdIACwHtAEHM0gALkAMwDDENeA5/D4AQgRGGEokTihOOFI8VkBaTE5QXlRiWGZcamhucGZ0cnh2fHqYfqR+uH7EgsiC3Ib8ixSPII8sj3STyI/Yl9yYgLTouPS8+MD8xQDFDMkQzRTRQNVE2UjdTOFQ5WTpbO1w8YT1jPmU/ZkBoQWlCakBrQ2xEb0JxRXJGdUd9SIJJh0qJS4pMi0yMTZJOnU+eUEVXex18HX0df1iGWYhaiVqKWoxbjlyPXKxdrV6uXq9ewl/MYM1hzmHPYtBj0WTVZdZm12fwaPFp8mrza/Rs9W35bv0t/i3/LVBpUWlSaVNpVGlVaVZpV2lYaVlpWmlbaVxpXWleaV9pggCDAIQAhQCGAIcAiACJAMB1z3aAiYGKgouFjIaNcJ1xnXaed554n3mfeqB7oHyhfaGzorqju6O8pL6lw6LMpNqm26blauqn66fsbvOi+Kj5qPqp+6n8pCawKrErsk6zhAhiumO7ZLxlvWa+bb9uwG/BcMJ+w3/Dfc+N0JTRq9Ks063UsNWx1rLXxNjF2cbaAEHc1QALATwAQejVAAsrAgAAACQAAABJAG4AZABlAHgAIABvAHUAdAAgAG8AZgAgAHIAYQBuAGcAZQBBnNYACwEsAEGo1gALIQIAAAAaAAAAfgBsAGkAYgAvAGEAcgByAGEAeQAuAHQAcwBBzNYACwF8AEHY1gALZQIAAABeAAAARQBsAGUAbQBlAG4AdAAgAHQAeQBwAGUAIABtAHUAcwB0ACAAYgBlACAAbgB1AGwAbABhAGIAbABlACAAaQBmACAAYQByAHIAYQB5ACAAaQBzACAAaABvAGwAZQB5AEHM1wALASwAQdjXAAsjAgAAABwAAABJAG4AdgBhAGwAaQBkACAAbABlAG4AZwB0AGgAQfzXAAsBPABBiNgACy0CAAAAJgAAAH4AbABpAGIALwBhAHIAcgBhAHkAYgB1AGYAZgBlAHIALgB0AHMAQbzYAAsBPABByNgACy0CAAAAJgAAAH4AbABpAGIALwBzAHQAYQB0AGkAYwBhAHIAcgBhAHkALgB0AHMAQfzYAAsBPABBiNkACysCAAAAJAAAAH4AbABpAGIALwB0AHkAcABlAGQAYQByAHIAYQB5AC4AdABzAEG82QALATwAQcjZAAsxAgAAACoAAABPAGIAagBlAGMAdAAgAGEAbAByAGUAYQBkAHkAIABwAGkAbgBuAGUAZABBnNoACwE8AEGo2gALLwIAAAAoAAAATwBiAGoAZQBjAHQAIABpAHMAIABuAG8AdAAgAHAAaQBuAG4AZQBkAEGA2wALIQgAAAAgAAAAIAAAACAAAAAAAAAAQgAAAAJBAABBAAAAZA==";

let t: any = null;
function a(w: string) {
  const g = typeof atob === "function" ? atob(w) : Buffer.from(w, "base64").toString("binary");
  const Y = new ArrayBuffer(g.length);
  const Q = new Uint8Array(Y);
  for (let E = 0; E < g.length; E++) Q[E] = g.charCodeAt(E);
  return Q;
}

async function l() {
  try {
    const w = await WebAssembly.compile(a(R));
    const inst = await f(w, { env: {} });
    return inst;
  } catch {
    return null;
  }
}

function M() {
  return t || (t = l()), t;
}

export async function decryptStreamPayload(
  payloadBase64: string,
  host: string = "player.vidzee.wtf"
): Promise<{ url: string; language?: string; headers?: any } | null> {
  const g = await M();
  if (!g) return null;
  try {
    const binary = typeof atob === "function" ? atob(payloadBase64) : Buffer.from(payloadBase64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decryptedBytes = g.decrypt(bytes, host);
    if (!decryptedBytes || !decryptedBytes.length) return null;
    const text = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- VIDUKI EXTRACTOR & CRYPTOGRAPHY ---

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
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
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < words.length; offset += 16) {
    w.set(words.subarray(offset, offset + 16));
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      w[i] = w[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + w[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10));
    }
    let [a, b, c, d, e, f, g, j] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (j + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      j = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    const round = [a, b, c, d, e, f, g, j];
    for (let i = 0; i < 8; i++) h[i] += round[i];
  }
  return h;
}

function sha256Hex(value: string): string {
  const h = sha256(value);
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += (h[i] >>> 0).toString(16).padStart(8, "0");
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function randomHex(bytes: number): string {
  let hex = "";
  for (let i = 0; i < bytes * 2; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

function solveAltcha(challengeData: any): string | null {
  const { algorithm, challenge, maxnumber, salt, signature } = challengeData;
  const max = maxnumber || 100000;
  const start = Date.now();
  for (let i = 0; i <= max; i++) {
    const hash = sha256Hex(salt + i);
    if (hash === challenge) {
      const payload = JSON.stringify({
        algorithm,
        challenge,
        number: i,
        salt,
        signature,
        took: Date.now() - start,
      });
      return typeof btoa === "function" ? btoa(payload) : Buffer.from(payload).toString("base64");
    }
  }
  return null;
}

// Viduki WASM module binary (Makima decryptor)
const MAKIMA_WASM_URL = "https://www.viduki.net/makima.f623306fa3066c49.wasm";
let vidukiInstance: any = null;
const _ = {
  alloc: "_efec",
  reset: "_0ZB8",
  writeByte: "_Zcyc",
  readByte: "_bZwV",
  decryptPepper: "_qViy",
  decryptEnvelope: "_G3J7",
  dropPepper: "_DfyW",
};

async function getVidukiWasm(axios: any): Promise<any> {
  if (vidukiInstance) return vidukiInstance;
  try {
    const res = await axios.get(MAKIMA_WASM_URL, {
      responseType: "arraybuffer",
      headers: {
        Referer: "https://www.viduki.net/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const bytes = new Uint8Array(res.data);
    const { instance } = await WebAssembly.instantiate(bytes, {
      env: { abort: () => { throw new Error("wasm abort"); } },
    });
    vidukiInstance = instance.exports;
    return vidukiInstance;
  } catch {
    return null;
  }
}

export async function extractVidukiStreams({
  tmdbId,
  season,
  episode,
  isMovie,
  axios,
  signal,
}: {
  tmdbId: string;
  season?: number;
  episode?: number;
  isMovie: boolean;
  axios: any;
  signal?: AbortSignal;
}): Promise<Array<{ server: string; url: string; type: "m3u8" | "mp4"; quality: string; headers?: any }>> {
  const wasm = await getVidukiWasm(axios);
  if (!wasm) return [];

  function writeBytes(bytes: Uint8Array): number {
    const ptr = wasm[_.alloc](bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      wasm[_.writeByte](ptr, i, bytes[i]);
    }
    return ptr;
  }

  function readBytes(ptr: number, len: number): Uint8Array {
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = wasm[_.readByte](ptr, i);
    }
    return out;
  }

  const commonHeaders = {
    Referer: "https://www.viduki.net/",
    Origin: "https://www.viduki.net",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  try {
    // 1. Altcha challenge & Bootstrap
    const chal1Res = await axios.get("https://api.viduki.net/altcha-challenge", { headers: commonHeaders, signal, timeout: 3500 });
    const altcha1 = solveAltcha(chal1Res.data);
    if (!altcha1) return [];

    const bootRes = await axios.get("https://api.viduki.net/bootstrap", {
      headers: { ...commonHeaders, "X-Altcha": altcha1 },
      signal,
      timeout: 3500,
    });
    const nonce = bootRes.data?.n;
    if (!nonce) return [];

    // 2. Pepper-key challenge & Decrypt
    const chal2Res = await axios.get("https://api.viduki.net/altcha-challenge", { headers: commonHeaders, signal, timeout: 3500 });
    const altcha2 = solveAltcha(chal2Res.data);
    if (!altcha2) return [];

    const pepperRes = await axios.get("https://api.viduki.net/pepper-key", {
      headers: { ...commonHeaders, Accept: "application/json", "X-Nonce": nonce, "X-Altcha": altcha2 },
      signal,
      timeout: 4000,
    });
    const pepper = pepperRes.data;
    if (!pepper || !pepper.bucket) return [];

    wasm[_.reset]();

    const pNonce = hexToBytes(nonce);
    const pNoncePtr = writeBytes(pNonce);

    const pBucketBuf = new Uint8Array(8);
    new DataView(pBucketBuf.buffer).setBigInt64(0, BigInt(pepper.bucket), false);
    const pBucketPtr = writeBytes(pBucketBuf);

    const pIv = hexToBytes(pepper.iv);
    const pIvPtr = writeBytes(pIv);

    const pCt = hexToBytes(pepper.ct);
    const pCtPtr = writeBytes(pCt);

    const pTag = hexToBytes(pepper.tag);
    const pTagPtr = writeBytes(pTag);

    wasm[_.decryptPepper](
      pNoncePtr, pNonce.length,
      pBucketPtr, 8,
      pIvPtr, pIv.length,
      pCtPtr, pCt.length,
      pTagPtr, pTag.length
    );

    // 3. Fetch server envelopes in parallel
    const srvList = ["Sherry", "Jill", "Ada", "Ethan", "Grace", "Leon", "Claire"];
    const fetchPromises = srvList.map(async (srv) => {
      try {
        const clientNonce = randomHex(16);
        const requestId = randomHex(16);
        const endpoint = isMovie
          ? `https://api.viduki.net/main/movie/${tmdbId}?srv=${srv}`
          : `https://api.viduki.net/main/tv/${tmdbId}/${season || 1}/${episode || 1}?srv=${srv}`;

        const res = await axios.get(endpoint, {
          headers: {
            ...commonHeaders,
            Accept: "application/json",
            "X-Nonce": nonce,
            "X-Client-Nonce": clientNonce,
            "X-Request-Id": requestId,
          },
          signal,
          timeout: 4500,
        });
        const env = res.data;
        return { srv, clientNonce, requestId, env };
      } catch {
        return null;
      }
    });

    const envResults = await Promise.all(fetchPromises);
    const streams: Array<{ server: string; url: string; type: "m3u8" | "mp4"; quality: string; headers?: any }> = [];

    // 4. Decrypt envelopes sequentially in WASM
    for (const item of envResults) {
      if (!item || !item.env || !item.env.ct) continue;
      const { srv, clientNonce, requestId, env } = item;
      try {
        const cNonce = hexToBytes(clientNonce);
        const sNonce = hexToBytes(env.sn);
        const tbBuf = new Uint8Array(8);
        new DataView(tbBuf.buffer).setBigInt64(0, BigInt(env.tb), false);
        const rId = hexToBytes(requestId);
        const iv2 = hexToBytes(env.iv2);
        const wk = hexToBytes(env.wk);
        const tag2 = hexToBytes(env.tag2);
        const iv1 = hexToBytes(env.iv1);
        const ct = hexToBytes(env.ct);
        const tag1 = hexToBytes(env.tag1);

        const cNoncePtr = writeBytes(cNonce);
        const sNoncePtr = writeBytes(sNonce);
        const tbPtr = writeBytes(tbBuf);
        const rIdPtr = writeBytes(rId);
        const iv2Ptr = writeBytes(iv2);
        const wkPtr = writeBytes(wk);
        const tag2Ptr = writeBytes(tag2);
        const iv1Ptr = writeBytes(iv1);
        const ctPtr = writeBytes(ct);
        const tag1Ptr = writeBytes(tag1);

        const outPtr = wasm[_.alloc](ct.length);
        const dLen = wasm[_.decryptEnvelope](
          cNoncePtr, cNonce.length,
          sNoncePtr, sNonce.length,
          tbPtr, 8,
          rIdPtr, rId.length,
          iv2Ptr, iv2.length,
          wkPtr, wk.length,
          tag2Ptr, tag2.length,
          iv1Ptr, iv1.length,
          ctPtr, ct.length,
          tag1Ptr, tag1.length,
          outPtr
        );

        if (dLen > 0) {
          const dText = new TextDecoder().decode(readBytes(outPtr, dLen));
          const json = JSON.parse(dText);
          if (json.stream && json.stream.url) {
            const streamUrl: string = json.stream.url;
            const isM3u8 = streamUrl.includes(".m3u8");
            streams.push({
              server: `1Flex - Viduki (${srv})`,
              url: streamUrl,
              type: isM3u8 ? "m3u8" : "mp4",
              quality: srv === "Sherry" ? "720" : "1080",
              headers: {
                Referer: "https://www.viduki.net/",
                Origin: "https://www.viduki.net",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            });
          }
        }
      } catch {
        // ignore individual decrypt errors
      }
    }

    return streams;
  } catch {
    return [];
  }
}
