import { ProviderContext, Stream, TextTracks } from "../types";

const CINEJOY_ORIGIN = "https://cinejoy.pk";
const FALLBACK_SERVERS: Array<{ name: string; status?: string; "4k"?: boolean }> = [
  { name: "Light", "4k": true },
  { name: "Nebula" },
  { name: "Sirius", "4k": true },
  { name: "Polaris" },
];

let cachedCode: string | null = null;
let cachedServers: Array<{ name: string; status?: string; "4k"?: boolean }> = [
  ...FALLBACK_SERVERS,
];
let lastServerFetchTime = 0;

function safeBtoa(str: string): string {
  if (typeof btoa !== "undefined") return btoa(str);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  for (
    let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("Invalid character in btoa");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

function safeAtob(input: string): string {
  if (typeof atob !== "undefined") return atob(input);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const str = String(input).replace(/=+$/, "");
  let output = "";
  if (str.length % 4 === 1) {
    throw new Error("Invalid atob length");
  }
  for (
    let bc = 0, bs = 0, buffer: any, i = 0;
    (buffer = str.charAt(i++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function toUint8Array(rawData: any): Uint8Array {
  if (!rawData) return new Uint8Array(0);
  if (rawData instanceof Uint8Array) return rawData;
  if (rawData instanceof ArrayBuffer) return new Uint8Array(rawData);
  if (ArrayBuffer.isView(rawData)) {
    return new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength);
  }
  if (typeof rawData === "string") {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(rawData);
    }
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i) & 0xff;
    return out;
  }
  return new Uint8Array(0);
}

function decodeUtf8(uint8: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("utf-8").decode(uint8);
    } catch {}
  }
  let out = "";
  for (let i = 0; i < uint8.length; i++) {
    out += String.fromCharCode(uint8[i]);
  }
  return out;
}

function parseExportMap(code: string): Record<string, string> {
  const match = code.match(/export\s*\{([^}]+)\}\s*;?\s*$/);
  if (!match) return {};
  const map: Record<string, string> = {};
  for (const part of match[1].split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const asMatch = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
    if (asMatch) {
      map[asMatch[2]] = asMatch[1];
    } else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
      map[trimmed] = trimmed;
    }
  }
  return map;
}

function extractImportedLocals(code: string): string[] {
  const locals = new Set<string>();
  const importRegex = /^\s*import\s*([\s\S]*?)\s*from\s*["'][^"']+["']\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(code)) !== null) {
    const clause = m[1].trim();
    const braceMatch = clause.match(/\{([^}]+)\}/);
    if (braceMatch) {
      for (const part of braceMatch[1].split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const asMatch = trimmed.match(/as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
        const name = asMatch ? asMatch[1] : trimmed;
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) locals.add(name);
      }
    }
    const starMatch = clause.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (starMatch) locals.add(starMatch[1]);
    const defMatch = clause.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (defMatch) locals.add(defMatch[1]);
  }
  return Array.from(locals);
}

function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s*(?:[\s\S]*?from\s*)?["'][^"']+["']\s*;?/gm, "")
    .replace(/export\s*\{[^}]+\}\s*;?\s*$/, "");
}

function buildSandbox(
  axios: any,
  headers: Record<string, string>,
  watchPath: string,
  importedLocals: string[],
  signal?: AbortSignal
): Record<string, any> {
  const safeCrypto =
    typeof crypto !== "undefined" && crypto
      ? typeof crypto.getRandomValues === "function"
        ? crypto
        : {
            ...crypto,
            getRandomValues: (arr: Uint8Array) => {
              for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
              }
              return arr;
            },
          }
      : {
          getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
              arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
          },
        };

  const locationObj = {
    origin: CINEJOY_ORIGIN,
    href: `${CINEJOY_ORIGIN}${watchPath}`,
    pathname: watchPath,
    host: "cinejoy.pk",
    hostname: "cinejoy.pk",
  };

  const sandbox: Record<string, any> = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Map,
    Set,
    Promise,
    TextEncoder: typeof TextEncoder !== "undefined" ? TextEncoder : undefined,
    TextDecoder: typeof TextDecoder !== "undefined" ? TextDecoder : undefined,
    URL: typeof URL !== "undefined" ? URL : undefined,
    URLSearchParams:
      typeof URLSearchParams !== "undefined" ? URLSearchParams : undefined,
    setTimeout: typeof setTimeout !== "undefined" ? setTimeout : undefined,
    clearTimeout: typeof clearTimeout !== "undefined" ? clearTimeout : undefined,
    setInterval: typeof setInterval !== "undefined" ? setInterval : undefined,
    clearInterval:
      typeof clearInterval !== "undefined" ? clearInterval : undefined,
    AbortController:
      typeof AbortController !== "undefined" ? AbortController : undefined,
    btoa: safeBtoa,
    atob: safeAtob,
    crypto: safeCrypto,
    WebAssembly: typeof WebAssembly !== "undefined" ? WebAssembly : undefined,
    caches: {
      open: async () => ({
        match: async () => null,
        put: async () => {},
      }),
    },
    location: locationObj,
    window: {
      location: locationObj,
      localStorage: { getItem: () => null, setItem: () => {} },
    },
    document: {
      referrer: `${CINEJOY_ORIGIN}/`,
      title: "Cinejoy",
      createElement: () => ({}),
      head: { appendChild: () => {} },
      body: { appendChild: () => {} },
    },
    navigator: {
      onLine: true,
      userAgent: headers["User-Agent"],
    },
    fetch: async (u: any, opts?: any) => {
      const url = typeof u === "string" ? u : String(u);
      let bodyData = opts?.body;
      if (bodyData instanceof ArrayBuffer) {
        bodyData = new Uint8Array(bodyData);
      }
      try {
        const fetchRes = await axios({
          url,
          method: opts?.method || "GET",
          headers: {
            ...headers,
            ...(opts?.headers || {}),
          },
          data: bodyData,
          responseType: "arraybuffer",
          timeout: 12000,
          signal,
        });
        const uint8 = toUint8Array(fetchRes.data);
        return {
          ok: fetchRes.status >= 200 && fetchRes.status < 300,
          status: fetchRes.status,
          text: async () => decodeUtf8(uint8),
          json: async () => JSON.parse(decodeUtf8(uint8)),
          arrayBuffer: async () =>
            uint8.buffer.slice(
              uint8.byteOffset,
              uint8.byteOffset + uint8.byteLength
            ),
          headers: new Map(Object.entries(fetchRes.headers || {})),
        };
      } catch (e: any) {
        const uint8 = e?.response?.data
          ? toUint8Array(e.response.data)
          : new Uint8Array(0);
        return {
          ok: false,
          status: e?.response?.status || 500,
          text: async () => decodeUtf8(uint8),
          json: async () => (uint8.length ? JSON.parse(decodeUtf8(uint8)) : {}),
          arrayBuffer: async () =>
            uint8.buffer.slice(
              uint8.byteOffset,
              uint8.byteOffset + uint8.byteLength
            ),
          headers: new Map(Object.entries(e?.response?.headers || {})),
        };
      }
    },
  };

  for (const local of importedLocals) {
    if (!(local in sandbox)) {
      sandbox[local] = {};
    }
  }
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function evaluateCinejoyChunk(
  code: string,
  sandbox: Record<string, any>
): Record<string, any> {
  const exportMap = parseExportMap(code);
  const strippedCode = stripModuleSyntax(code);
  const returnEntries = Object.entries(exportMap).map(
    ([exported, local]) =>
      `${JSON.stringify(exported)}: (typeof ${local} !== "undefined" ? ${local} : undefined)`
  );
  const returnExpr = `{ ${returnEntries.join(", ")} }`;

  try {
    const runner = new Function(
      "sandbox",
      `with(sandbox){\n${strippedCode}\n;return ${returnExpr};\n}`
    );
    return runner(sandbox) || {};
  } catch {
    const keys = Object.keys(sandbox).filter((k) =>
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)
    );
    const values = keys.map((k) => sandbox[k]);
    const runner = new Function(
      ...keys,
      `${strippedCode}\n;return ${returnExpr};\n`
    );
    return runner(...values) || {};
  }
}

function selectResolver(
  exportsObj: Record<string, any>
): ((...args: any[]) => Promise<any>) | null {
  if (typeof exportsObj.s === "function") {
    return exportsObj.s;
  }
  for (const val of Object.values(exportsObj)) {
    if (typeof val === "function" && val.length === 4) {
      const src = String(val);
      if (
        src.includes("result") &&
        src.includes("providers") &&
        src.includes("failure")
      ) {
        return val as (...args: any[]) => Promise<any>;
      }
    }
  }
  return null;
}

async function discoverCinejoyChunk(
  axios: any,
  headers: Record<string, string>,
  isMovie: boolean,
  signal?: AbortSignal
): Promise<string | null> {
  if (cachedCode) return cachedCode;

  const homeRes = await axios.get(`${CINEJOY_ORIGIN}/`, {
    headers,
    timeout: 6000,
    signal,
  });
  const html = typeof homeRes.data === "string" ? homeRes.data : "";
  const appMatch = html.match(
    /_app\/immutable\/entry\/app\.[A-Za-z0-9_-]+\.js/
  );
  if (!appMatch) return null;

  const appRes = await axios.get(`${CINEJOY_ORIGIN}/${appMatch[0]}`, {
    headers,
    timeout: 6000,
    signal,
  });
  const appText = typeof appRes.data === "string" ? appRes.data : "";

  const movieNodeId = appText.match(
    /"\/watch\/movie\/\[id\]"\s*:\s*\[(\d+)/
  )?.[1];
  const tvNodeId = appText.match(
    /"\/watch\/tv\/\[id\][^"]*"\s*:\s*\[(\d+)/
  )?.[1];
  const targetNodeId = isMovie
    ? movieNodeId || tvNodeId
    : tvNodeId || movieNodeId;
  if (!targetNodeId) return null;

  const nodeMatches = [...appText.matchAll(/nodes\/(\d+)\.[A-Za-z0-9_-]+\.js/g)];
  const nodeMatch =
    nodeMatches.find((m) => m[1] === targetNodeId) ||
    (movieNodeId ? nodeMatches.find((m) => m[1] === movieNodeId) : undefined);
  if (!nodeMatch) return null;

  const nodeRes = await axios.get(
    `${CINEJOY_ORIGIN}/_app/immutable/${nodeMatch[0]}`,
    { headers, timeout: 6000, signal }
  );
  const nodeText = typeof nodeRes.data === "string" ? nodeRes.data : "";

  const chunkNames = Array.from(
    new Set(
      [...nodeText.matchAll(/chunks\/([A-Za-z0-9_-]+\.js)/g)].map((m) => m[1])
    )
  );

  for (const ch of chunkNames) {
    try {
      const chRes = await axios.get(
        `${CINEJOY_ORIGIN}/_app/immutable/chunks/${ch}`,
        { headers, timeout: 6000, signal }
      );
      const chText = typeof chRes.data === "string" ? chRes.data : "";
      if (!chText.includes("WebAssembly")) continue;
      if (!/export\s*\{[^}]+\}\s*;?\s*$/.test(chText)) continue;

      const probeSandbox = buildSandbox(
        axios,
        headers,
        "/",
        extractImportedLocals(chText),
        signal
      );
      const probeExports = evaluateCinejoyChunk(chText, probeSandbox);
      const hasFourArgFn = Object.values(probeExports).some(
        (v) => typeof v === "function" && v.length === 4
      );
      if (hasFourArgFn) {
        cachedCode = chText;
        return chText;
      }
    } catch {
      // Try next chunk
    }
  }

  return null;
}

function mapCaption(c: any): TextTracks[number] | null {
  const uri = c?.url || c?.file;
  if (!uri) return null;
  const langRaw = c.language || c.lang || "en";
  return {
    title: c.display || c.label || c.language || "Subtitle",
    language: String(langRaw).slice(0, 2).toLowerCase(),
    type:
      c.type === "vtt" || String(uri).endsWith(".vtt")
        ? "text/vtt"
        : "application/x-subrip",
    uri: String(uri),
  };
}

function raceWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error("Aborted"));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Server timeout"));
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}

export async function extractCinejoyStreams({
  tmdbId,
  imdbId,
  title,
  year,
  season,
  episode,
  type,
  providerContext,
  signal,
}: {
  tmdbId: string;
  imdbId?: string;
  title?: string;
  year?: string;
  season?: number | string;
  episode?: number | string;
  type: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<Stream[]> {
  const { axios, commonHeaders } = providerContext;
  const isMovie = type === "movie";
  const mediaType = isMovie ? "movie" : "tv";

  if (!tmdbId) return [];

  const watchPath = `/watch/${mediaType}/${tmdbId}${
    isMovie ? "" : `/${season || 1}/${episode || 1}`
  }`;

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Origin: CINEJOY_ORIGIN,
    Referer: `${CINEJOY_ORIGIN}${watchPath}`,
    ...(commonHeaders || {}),
  };

  try {
    const chunkCode = await discoverCinejoyChunk(axios, headers, isMovie, signal);
    if (!chunkCode) return [];

    if (Date.now() - lastServerFetchTime > 300000) {
      try {
        const sRes = await axios.get("https://api2.wing.st/servers", {
          headers,
          timeout: 5000,
          signal,
        });
        if (Array.isArray(sRes.data?.servers) && sRes.data.servers.length) {
          const available = sRes.data.servers.filter(
            (s: any) => s && s.name && s.status !== "offline"
          );
          if (available.length) {
            cachedServers = available;
            lastServerFetchTime = Date.now();
          }
        }
      } catch {}
    }

    const subPromise = (async (): Promise<TextTracks> => {
      try {
        const subUrl = `https://subs.wing.st/subtitles?tmdb=${tmdbId}${
          isMovie ? "" : `&season=${season || 1}&episode=${episode || 1}`
        }`;
        const subRes = await axios.get(subUrl, { headers, timeout: 5000, signal });
        const rawList = Array.isArray(subRes.data)
          ? subRes.data
          : Array.isArray(subRes.data?.subtitles)
          ? subRes.data.subtitles
          : [];
        return rawList
          .map(mapCaption)
          .filter((s: TextTracks[number] | null): s is TextTracks[number] =>
            Boolean(s)
          );
      } catch {
        return [];
      }
    })();

    const sandbox = buildSandbox(
      axios,
      headers,
      watchPath,
      extractImportedLocals(chunkCode),
      signal
    );
    const exportsObj = evaluateCinejoyChunk(chunkCode, sandbox);
    const resolver = selectResolver(exportsObj);
    if (!resolver) return [];

    const activeServers = (cachedServers || []).filter(
      (s) => s && s.name && s.status !== "offline"
    );

    const externalSubtitles = await subPromise;
    const streamHeaders = {
      Referer: `${CINEJOY_ORIGIN}/`,
      Origin: CINEJOY_ORIGIN,
      "User-Agent": headers["User-Agent"],
    };

    const resolverParams: Record<string, any> = {
      tmdbId: String(tmdbId),
      ...(imdbId ? { imdbId } : {}),
      ...(year ? { year } : {}),
      ...(title ? { title } : {}),
      ...(!isMovie
        ? { season: Number(season || 1), episode: Number(episode || 1) }
        : {}),
    };

    const streams: Stream[] = [];
    const seenLinks = new Set<string>();

    const tasks = activeServers.map(async (srv) => {
      try {
        const res = await raceWithTimeout(
          resolver(mediaType, resolverParams, () => {}, srv.name),
          12000,
          signal
        );
        const result = res?.result;
        if (!result || !result.url) return;

        const streamUrl = String(result.url);
        if (seenLinks.has(streamUrl)) return;

        const streamType =
          result.sourceType === "hls"
            ? "m3u8"
            : result.sourceType || "mp4";

        if (streamType === "m3u8") {
          try {
            const playlist = await axios.get(streamUrl, {
              headers: streamHeaders,
              timeout: 4000,
              signal,
            });
            if (
              typeof playlist.data !== "string" ||
              !playlist.data.trimStart().startsWith("#EXTM3U")
            ) {
              return;
            }
          } catch {
            return;
          }
        }

        if (seenLinks.has(streamUrl)) return;
        seenLinks.add(streamUrl);

        const rawSubs = [
          ...(Array.isArray(result.captions)
            ? result.captions
                .map(mapCaption)
                .filter(
                  (s: TextTracks[number] | null): s is TextTracks[number] =>
                    Boolean(s)
                )
            : []),
          ...externalSubtitles,
        ];
        const seenSubs = new Set<string>();
        const subtitles: TextTracks = [];
        for (const s of rawSubs) {
          if (s.uri && !seenSubs.has(s.uri)) {
            seenSubs.add(s.uri);
            subtitles.push(s);
          }
        }

        streams.push({
          server: `Cinejoy - ${srv.name}${srv["4k"] ? " (4K)" : ""}`,
          link: streamUrl,
          type: streamType,
          quality: srv["4k"] ? "2160" : "1080",
          subtitles: subtitles.length ? subtitles : undefined,
          headers: streamHeaders,
        });
      } catch {
        // Skip server if unavailable or timed out
      }
    });

    await Promise.allSettled(tasks);
    return streams;
  } catch (err) {
    console.log("extractCinejoyStreams error:", err);
    return [];
  }
}
