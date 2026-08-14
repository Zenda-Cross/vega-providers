import axios from "axios";
import { headers } from "./headers";
import * as cheerio from "cheerio";
import { ProviderContext } from "./types";
import cffi from "curl-cffi-node";
import zlib from "zlib";

// Helper to decompress buffer based on headers
function decompressBuffer(rawBuffer: Buffer, headers: any): Buffer {
  let contentEncoding = "";
  if (headers && typeof headers === "object") {
    if (typeof headers.get === "function") {
      contentEncoding = headers.get("content-encoding") || "";
    } else {
      contentEncoding = headers["content-encoding"] || headers["Content-Encoding"] || "";
    }
  }

  let decodedBuffer = rawBuffer;
  if (contentEncoding) {
    const enc = contentEncoding.toLowerCase();
    try {
      if (enc.includes('br')) {
        decodedBuffer = zlib.brotliDecompressSync(rawBuffer);
      } else if (enc.includes('gzip')) {
        decodedBuffer = zlib.gunzipSync(rawBuffer);
      } else if (enc.includes('deflate')) {
        decodedBuffer = zlib.inflateSync(rawBuffer);
      }
    } catch (e) {
      console.error("Decompression failed:", e);
    }
  }
  return decodedBuffer;
}

// 1. Hijack axios globally
axios.defaults.adapter = async (config) => {
  const method = (config.method || "get").toLowerCase();
  const cffiFunc = (cffi as any)[method] || cffi.get;
  
  let url = config.url || "";
  if (config.baseURL && !url.startsWith("http")) {
     url = config.baseURL + url;
  }
  
  const reqHeaders: Record<string, string> = {};
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      if (key.toLowerCase() === "accept-encoding") continue; // let curl handle compression or server send plain
      if (value !== undefined && value !== null) {
        reqHeaders[key] = String(value);
      }
    }
  }
  
  const res = await cffiFunc(url, {
    headers: reqHeaders,
    data: config.data,
    impersonate: "chrome120",
    verify: false
  });
  
  const rawBuffer = res.buffer();
  const decodedBuffer = decompressBuffer(rawBuffer, res.headers);
  
  let data: any;
  let contentType = "";
  if (res.headers && typeof res.headers === "object") {
     if (typeof (res.headers as any).get === "function") {
         contentType = (res.headers as any).get("content-type") || "";
     } else {
         contentType = (res.headers as any)["content-type"] || (res.headers as any)["Content-Type"] || "";
     }
  }
  
  if (config.responseType === "arraybuffer" || config.responseType === "stream") {
     data = decodedBuffer;
  } else {
     data = decodedBuffer.toString('utf8');
     if (config.responseType === "json" || contentType.includes("application/json")) {
        try { data = JSON.parse(data); } catch(e) {}
     }
  }

  return {
    data: data,
    status: res.status,
    statusText: "OK",
    headers: res.headers as any,
    config: config,
    request: {}
  };
};

// 2. Hijack fetch globally
const originalFetch = global.fetch;
global.fetch = async (url: any, options: any = {}) => {
  const method = (options.method || "get").toLowerCase();
  const cffiFunc = (cffi as any)[method] || cffi.get;
  
  const reqHeaders: Record<string, string> = {};
  if (options.headers) {
    const headersObj = options.headers instanceof Headers ? Object.fromEntries((options.headers as any).entries()) : options.headers;
    for (const [key, value] of Object.entries(headersObj)) {
      if (key.toLowerCase() === "accept-encoding") continue;
      if (value !== undefined && value !== null) {
        reqHeaders[key] = String(value);
      }
    }
  }

  const res = await cffiFunc(url.toString(), {
    headers: reqHeaders,
    data: options.body,
    impersonate: "chrome120",
    verify: false,
    allowRedirects: options.redirect === "manual" ? false : true,
  });
  
  const rawBuffer = res.buffer();
  const decodedBuffer = decompressBuffer(rawBuffer, res.headers);
  const textContent = decodedBuffer.toString('utf8');
  
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    url: res.url,
    headers: {
      get: (name: string) => (res.headers as any)[name.toLowerCase()],
      has: (name: string) => !!(res.headers as any)[name.toLowerCase()],
    },
    text: () => Promise.resolve(textContent),
    json: () => Promise.resolve(JSON.parse(textContent)),
    buffer: () => Promise.resolve(decodedBuffer),
    arrayBuffer: () => Promise.resolve(decodedBuffer.buffer),
  } as any;
};

export const providerContext: ProviderContext = {
  axios,
  Aes: null,
  commonHeaders: headers,
  cheerio,
};
