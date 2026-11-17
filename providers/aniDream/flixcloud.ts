import { ProviderContext } from "../types";
import { DEFAULT_USER_AGENT } from "./client";

export const FLIXCLOUD_BASE_URL = "https://flixcloud.cc";

export interface FlixCloudDownloadMetadata {
  fileId: string;
  filename: string;
  resolution?: string;
  sizeHuman?: string;
  base: string;
  token: string;
}

export interface FlixCloudResolvedMkv {
  url: string;
  filename: string;
  quality?: "360" | "480" | "720" | "1080" | "2160";
  sizeHuman?: string;
}

interface ProgressEventPayload {
  percent?: number;
  status?: string;
  error?: string;
}

export function decodeFlixCloudDevalue(data: any): FlixCloudDownloadMetadata {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const dataNode = nodes.find(
    (node: any) =>
      Array.isArray(node?.data) &&
      node.data[0] &&
      typeof node.data[0] === "object" &&
      "video" in node.data[0] &&
      "download" in node.data[0],
  );

  if (!dataNode) {
    throw new Error("FlixCloud metadata payload is missing video/download nodes");
  }

  const arr: any[] = dataNode.data;
  const root = arr[0];
  const video = typeof root.video === "number" ? arr[root.video] : root.video;
  const download =
    typeof root.download === "number" ? arr[root.download] : root.download;

  const pick = (ref: unknown) => (typeof ref === "number" ? arr[ref] : ref);

  const fileId = String(pick(video?.fileId) || "").trim();
  const filename = String(pick(video?.filename) || "").trim();
  const resolution = pick(video?.resolution)
    ? String(pick(video.resolution)).trim()
    : undefined;
  const sizeHuman = pick(video?.sizeHuman)
    ? String(pick(video.sizeHuman)).trim()
    : undefined;
  const base = String(pick(download?.base) || "")
    .trim()
    .replace(/\/+$/, "");
  const token = String(pick(download?.token) || "").trim();

  if (!fileId || !base || !token) {
    throw new Error("FlixCloud metadata is incomplete (missing fileId, base, or token)");
  }

  return { fileId, filename, resolution, sizeHuman, base, token };
}

export function normalizeQuality(
  resolution?: string,
): "360" | "480" | "720" | "1080" | "2160" | undefined {
  if (!resolution) return undefined;
  const match = resolution.match(/(2160|1080|720|480|360)/);
  return match
    ? (match[1] as "360" | "480" | "720" | "1080" | "2160")
    : undefined;
}

export function parseLastProgressEvent(sseText: string): ProgressEventPayload | null {
  if (!sseText) return null;
  let last: ProgressEventPayload | null = null;

  for (const rawLine of sseText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;
    const jsonPart = line.slice(5).trim();
    if (!jsonPart) continue;
    try {
      const parsed = JSON.parse(jsonPart);
      if (parsed && typeof parsed === "object") {
        last = parsed;
      }
    } catch {
      // Ignore partial or non-JSON SSE lines
    }
  }

  return last;
}

function decodeUtf8Bytes(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if ((b0 & 0xe0) === 0xc0 && i < bytes.length) {
      const b1 = bytes[i++];
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
    } else if ((b0 & 0xf0) === 0xe0 && i + 1 < bytes.length) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      out += String.fromCharCode(
        ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f),
      );
    } else if ((b0 & 0xf8) === 0xf0 && i + 2 < bytes.length) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const cp =
        (((b0 & 0x07) << 18) |
          ((b1 & 0x3f) << 12) |
          ((b2 & 0x3f) << 6) |
          (b3 & 0x3f)) -
        0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return out;
}

function extractRateLimitMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed?.error === "string") return parsed.error;
    } catch {
      if (data.trim()) return data.trim();
    }
    return null;
  }
  if (typeof data === "object" && typeof (data as any).error === "string") {
    return (data as any).error;
  }
  return null;
}

async function waitForFlixCloudProgress(
  progUrl: string,
  options: {
    providerContext: ProviderContext;
    signal?: AbortSignal;
    userAgent: string;
  },
): Promise<void> {
  const { providerContext, signal, userAgent } = options;
  const headers = {
    Accept: "text/event-stream",
    Origin: FLIXCLOUD_BASE_URL,
    Referer: `${FLIXCLOUD_BASE_URL}/`,
    "User-Agent": userAgent,
  };

  if (typeof fetch === "function") {
    let receivedResponse = false;
    try {
      const response = await fetch(progUrl, { headers, signal });
      receivedResponse = true;
      if (response.status === 429) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          extractRateLimitMessage(errText) ||
            "FlixCloud rate limit reached. Please try again shortly.",
        );
      }
      if (!response.ok) {
        throw new Error(`FlixCloud progress failed with HTTP ${response.status}`);
      }

      const reader = (response as any)?.body?.getReader?.();
      if (reader) {
        let buffer = "";
        let lastEvent: ProgressEventPayload | null = null;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += decodeUtf8Bytes(
                value instanceof Uint8Array ? value : new Uint8Array(value),
              );
              const parsed = parseLastProgressEvent(buffer);
              if (parsed) {
                lastEvent = parsed;
                if (parsed.status === "ready") {
                  await reader.cancel().catch(() => {});
                  return;
                }
                if (parsed.status === "failed") {
                  await reader.cancel().catch(() => {});
                  throw new Error(
                    parsed.error || "FlixCloud download preparation failed",
                  );
                }
              }
            }
          }
        } finally {
          reader.releaseLock?.();
        }

        if (lastEvent?.status === "ready") return;
        if (lastEvent?.status === "failed") {
          throw new Error(
            lastEvent.error || "FlixCloud download preparation failed",
          );
        }
        throw new Error("FlixCloud progress stream ended before ready");
      }

      const fullText = await response.text();
      const parsed = parseLastProgressEvent(fullText);
      if (parsed?.status === "ready") return;
      if (parsed?.status === "failed") {
        throw new Error(parsed.error || "FlixCloud download preparation failed");
      }
      throw new Error("FlixCloud progress stream did not reach ready state");
    } catch (err: any) {
      if (receivedResponse || err?.name === "AbortError") {
        throw err;
      }
    }
  }

  const res = await providerContext.axios.get(progUrl, {
    headers,
    responseType: "text",
    signal,
    timeout: 60000,
    validateStatus: () => true,
  });

  if (res.status === 429) {
    throw new Error(
      extractRateLimitMessage(res.data) ||
        "FlixCloud rate limit reached. Please try again shortly.",
    );
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`FlixCloud progress failed with HTTP ${res.status}`);
  }

  const parsed = parseLastProgressEvent(
    typeof res.data === "string" ? res.data : "",
  );
  if (parsed?.status === "ready") return;
  if (parsed?.status === "failed") {
    throw new Error(parsed.error || "FlixCloud download preparation failed");
  }
  throw new Error("FlixCloud progress stream did not reach ready state");
}

function resolveAbsoluteUrl(location: string, base: string): string {
  try {
    return new URL(location, base).href;
  } catch {
    return location;
  }
}

function getRedirectTargetFromResponse(res: any, dlUrl: string, base: string): string | null {
  const status = Number(res?.status || 0);
  const location = res?.headers?.location || res?.headers?.Location;

  if (status >= 300 && status < 400 && typeof location === "string" && location.trim()) {
    return resolveAbsoluteUrl(location.trim(), dlUrl);
  }

  const responseUrl =
    res?.request?.responseURL ||
    res?.request?.res?.responseUrl ||
    res?.config?.url;

  if (
    status >= 200 &&
    status < 300 &&
    typeof responseUrl === "string" &&
    responseUrl !== dlUrl &&
    !responseUrl.startsWith(`${base}/download/`)
  ) {
    return responseUrl;
  }

  return null;
}

async function resolveFinalMkvUrl(
  dlUrl: string,
  base: string,
  options: {
    providerContext: ProviderContext;
    signal?: AbortSignal;
    userAgent: string;
  },
): Promise<string> {
  const { providerContext, signal, userAgent } = options;
  const baseHeaders = {
    Origin: FLIXCLOUD_BASE_URL,
    Referer: `${FLIXCLOUD_BASE_URL}/`,
    "User-Agent": userAgent,
  };

  let res = await providerContext.axios.head(dlUrl, {
    headers: baseHeaders,
    maxRedirects: 0,
    validateStatus: () => true,
    signal,
    timeout: 20000,
  });

  if (res.status === 405 || res.status === 501) {
    // Fallback to a 1-byte Range GET so even if an RN/OkHttp client auto-follows 302s,
    // it never buffers the full MKV body into memory.
    res = await providerContext.axios.get(dlUrl, {
      headers: {
        ...baseHeaders,
        Range: "bytes=0-0",
      },
      maxRedirects: 0,
      responseType: "arraybuffer",
      validateStatus: () => true,
      signal,
      timeout: 20000,
    });
  }

  if (res.status === 429) {
    throw new Error(
      extractRateLimitMessage(res.data) ||
        "FlixCloud rate limit reached. Please try again shortly.",
    );
  }

  const target = getRedirectTargetFromResponse(res, dlUrl, base);
  if (target) {
    return target;
  }

  if (res.status === 202) {
    // One brief wait after SSE ready in case CDN propagation lags slightly; never poll in a loop.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const retryRes = await providerContext.axios.head(dlUrl, {
      headers: baseHeaders,
      maxRedirects: 0,
      validateStatus: () => true,
      signal,
      timeout: 20000,
    });
    if (retryRes.status === 429) {
      throw new Error(
        extractRateLimitMessage(retryRes.data) ||
          "FlixCloud rate limit reached. Please try again shortly.",
      );
    }
    const retryTarget = getRedirectTargetFromResponse(retryRes, dlUrl, base);
    if (retryTarget) {
      return retryTarget;
    }
  }

  throw new Error(
    `FlixCloud did not return an MKV redirect URL (HTTP ${res.status})`,
  );
}

export async function resolveFlixCloudMkv(
  fileCode: string,
  options: {
    providerContext: ProviderContext;
    signal?: AbortSignal;
  },
): Promise<FlixCloudResolvedMkv> {
  const cleanCode = String(fileCode || "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cleanCode)) {
    throw new Error(`Invalid FlixCloud file code: ${fileCode}`);
  }

  const { providerContext, signal } = options;
  const userAgent =
    providerContext.commonHeaders?.["User-Agent"] ||
    providerContext.commonHeaders?.["user-agent"] ||
    DEFAULT_USER_AGENT;

  const dataUrl = `${FLIXCLOUD_BASE_URL}/d/${cleanCode}/__data.json`;
  const dataRes = await providerContext.axios.get(dataUrl, {
    headers: {
      ...(providerContext.commonHeaders || {}),
      Referer: `${FLIXCLOUD_BASE_URL}/d/${cleanCode}`,
      Accept: "application/json",
      "User-Agent": userAgent,
    },
    signal,
    timeout: 15000,
  });

  const payload =
    typeof dataRes.data === "string" ? JSON.parse(dataRes.data) : dataRes.data;
  const meta = decodeFlixCloudDevalue(payload);

  const encodedToken = encodeURIComponent(meta.token);
  const progUrl = `${meta.base}/download/${meta.fileId}/progress?token=${encodedToken}`;
  const dlUrl = `${meta.base}/download/${meta.fileId}?token=${encodedToken}`;

  await waitForFlixCloudProgress(progUrl, {
    providerContext,
    signal,
    userAgent,
  });

  const mkvUrl = await resolveFinalMkvUrl(dlUrl, meta.base, {
    providerContext,
    signal,
    userAgent,
  });

  return {
    url: mkvUrl,
    filename: meta.filename,
    quality: normalizeQuality(meta.resolution),
    sizeHuman: meta.sizeHuman,
  };
}
