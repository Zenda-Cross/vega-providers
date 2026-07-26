import { ProviderContext } from "../types";
import { MkvDramaPage, mergeMkvDramaCookies, mkvDramaHeaders } from "./request";

type BootstrapResponse = {
  gate_path: string;
  pass_path: string;
  dec_key: string;
};

type EncryptedPayload = {
  d?: string;
  s?: string;
};

type DynamicField = {
  n?: string;
  v?: string;
};

const cryptoApiUrl = "https://worker.zendax.me/api/crypto";

function parseBootstrapResponse(value: unknown): BootstrapResponse {
  const queue: unknown[] = [value];
  const seen = new Set<unknown>();

  while (queue.length && seen.size < 20) {
    const current = queue.shift();
    if (current === undefined || current === null || seen.has(current))
      continue;
    seen.add(current);

    if (typeof current === "string") {
      try {
        queue.push(JSON.parse(current.replace(/^\uFEFF/, "").trim()));
      } catch {
        continue;
      }
      continue;
    }

    if (current instanceof ArrayBuffer || ArrayBuffer.isView(current)) {
      const bytes =
        current instanceof ArrayBuffer
          ? new Uint8Array(current)
          : new Uint8Array(
              current.buffer,
              current.byteOffset,
              current.byteLength,
            );
      queue.push(Buffer.from(bytes).toString("utf8"));
      continue;
    }

    if (Array.isArray(current)) {
      if (current.every((item) => Number.isInteger(item))) {
        queue.push(Buffer.from(current).toString("utf8"));
      } else {
        queue.push(...current);
      }
      continue;
    }

    if (typeof current !== "object") continue;
    const response = current as Record<string, any>;
    const gatePath = response.gate_path || response.gatePath;
    const passPath = response.pass_path || response.passPath;
    const decryptionKey = response.dec_key || response.decKey;
    if (gatePath && passPath && decryptionKey) {
      return {
        gate_path: String(gatePath),
        pass_path: String(passPath),
        dec_key: String(decryptionKey),
      };
    }

    if (response.type === "Buffer" && Array.isArray(response.data)) {
      queue.push(response.data);
      continue;
    }

    ["data", "body", "result", "payload", "content", "response"].forEach(
      (key) => {
        if (response[key] !== undefined) queue.push(response[key]);
      },
    );
  }

  const shape =
    value && typeof value === "object"
      ? Object.keys(value as Record<string, unknown>)
          .slice(0, 8)
          .join(",")
      : typeof value;
  throw new Error(`MKVDrama loader bootstrap is invalid (${shape || "empty"})`);
}

function readCookie(cookies: string, name: string): string {
  const prefix = `${name}=`;
  return (
    cookies
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || ""
  );
}

async function decryptAesGcm(
  payload: EncryptedPayload,
  key: string,
  keyEncoding: "hex" | "base64",
  providerContext: ProviderContext,
): Promise<string> {
  if (!payload.d || !payload.s) {
    throw new Error("MKVDrama encrypted payload is invalid");
  }

  const encrypted = Buffer.from(payload.d, "base64");
  if (encrypted.length <= 16) {
    throw new Error("MKVDrama encrypted payload is too short");
  }
  const response = await providerContext.axios.post(cryptoApiUrl, {
    operation: "decrypt",
    algorithm: "aes-256-gcm",
    data: encrypted.subarray(0, -16).toString("base64"),
    authTag: encrypted.subarray(-16).toString("base64"),
    key,
    iv: payload.s,
    inputEncoding: "base64",
    authTagEncoding: "base64",
    keyEncoding,
    ivEncoding: "hex",
    outputEncoding: "utf8",
  });
  if (typeof response.data?.result !== "string") {
    throw new Error("MKVDrama crypto worker returned an invalid response");
  }
  return response.data.result;
}

async function decryptDynamicField(
  cookies: string,
  decryptionKey: string,
  providerContext: ProviderContext,
): Promise<DynamicField> {
  const encoded = readCookie(cookies, "_akx");
  if (!encoded) throw new Error("MKVDrama _akx cookie was not found");

  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("MKVDrama _akx cookie is invalid");
  }

  const field: DynamicField = JSON.parse(
    await decryptAesGcm(payload, decryptionKey, "hex", providerContext),
  );
  if (!field.n || !field.v) {
    throw new Error("MKVDrama dynamic request field is invalid");
  }
  return field;
}

async function derivePayloadKey(
  gateUrl: string,
  providerContext: ProviderContext,
): Promise<string> {
  const response = await providerContext.axios.post(cryptoApiUrl, {
    operation: "hash",
    algorithm: "sha256",
    data: `access-pass${new URL(gateUrl).pathname}`,
    outputEncoding: "base64",
  });
  if (typeof response.data?.result !== "string") {
    throw new Error("MKVDrama crypto worker returned an invalid hash");
  }
  return response.data.result;
}

function requestHeaders(pageUrl: string, cookies: string) {
  return {
    ...mkvDramaHeaders,
    Accept: "application/json",
    "Content-Type": "application/json",
    Cookie: cookies,
    Origin: new URL(pageUrl).origin,
    Referer: pageUrl,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
  };
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
  pageUrl: string,
  cookies: string,
  providerContext: ProviderContext,
) {
  const response = await providerContext.axios.post(url, body, {
    headers: requestHeaders(pageUrl, cookies),
  });
  return {
    data: response.data,
    cookies: mergeMkvDramaCookies(cookies, response.headers?.["set-cookie"]),
  };
}

async function loadVerifiedPage(
  page: MkvDramaPage,
  cookies: string,
  providerContext: ProviderContext,
): Promise<MkvDramaPage> {
  if (typeof providerContext.openWebView !== "function") {
    throw new Error("MKVDrama verification is required to load download links");
  }

  const result = await providerContext.openWebView(page.url, {
    title: "Open MKVDrama",
    description:
      "Complete the verification and wait for download links to load, then click done.",
    headers: {
      ...mkvDramaHeaders,
      Cookie: cookies,
      Referer: page.url,
    },
    waitForCookie: "cf_clearance",
    force: true,
    timeoutMs: 120000,
  });

  const data = result.data || "";
  if (!providerContext.cheerio.load(data)(".soraddlx").length) {
    throw new Error(
      "MKVDrama verification completed before download links were loaded",
    );
  }

  return {
    data,
    url: result.url || page.url,
    cookies: result.cookies || cookies,
    userAgent: result.userAgent,
  };
}

export async function loadMkvDramaEpisodeHtml(
  page: MkvDramaPage,
  providerContext: ProviderContext,
): Promise<MkvDramaPage> {
  const $ = providerContext.cheerio.load(page.data);
  if ($(".soraddlx").length || !$("#mlx-ph").length) return page;

  let cookies = page.cookies || mkvDramaHeaders.cookie || "";
  const bootstrapUrl = new URL(
    `${new URL(page.url).pathname.replace(/\/+$/, "")}/_vb3k_mnxr_w`,
    page.url,
  ).href;
  let bootstrapResponse;
  try {
    bootstrapResponse = await providerContext.axios.post(bootstrapUrl, null, {
      headers: requestHeaders(page.url, cookies),
    });
  } catch (error: any) {
    if (error.response?.status !== 403) throw error;
    return loadVerifiedPage(page, cookies, providerContext);
  }
  cookies = mergeMkvDramaCookies(
    cookies,
    bootstrapResponse.headers?.["set-cookie"],
  );

  const bootstrap = parseBootstrapResponse(bootstrapResponse.data);

  const dynamicField = await decryptDynamicField(
    cookies,
    bootstrap.dec_key,
    providerContext,
  );
  const dynamicValue = { [dynamicField.n!]: dynamicField.v };
  const gateUrl = new URL(bootstrap.gate_path, page.url).href;
  let gateResponse;
  try {
    gateResponse = await postJson(
      gateUrl,
      { r: null, i: false, w: false, ...dynamicValue },
      page.url,
      cookies,
      providerContext,
    );
  } catch (error: any) {
    if (error.response?.status !== 403) throw error;
    return loadVerifiedPage(page, cookies, providerContext);
  }
  cookies = gateResponse.cookies;

  const passUrl = new URL(bootstrap.pass_path, page.url).href;
  const passResponse = await postJson(
    passUrl,
    { r: null, w: false, ...dynamicValue },
    page.url,
    cookies,
    providerContext,
  );
  cookies = passResponse.cookies;

  const payloadKey = await derivePayloadKey(gateUrl, providerContext);
  const html = await decryptAesGcm(
    passResponse.data || {},
    payloadKey,
    "base64",
    providerContext,
  );

  return { ...page, data: html, cookies };
}
