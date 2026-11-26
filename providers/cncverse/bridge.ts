import { ProviderContext } from "../types";

/** Default CNCVerse Bridge (Stremio addon) endpoint. */
export const DEFAULT_BRIDGE = "https://cncverse.dpdns.org";

/** Reads the optional user override from provider settings. */
export async function getBridge(providerContext: ProviderContext): Promise<string> {
  let custom = "";
  try {
    custom = (await providerContext.kvStore?.get<string>("cncverse_bridgeUrl")) || "";
  } catch {
    custom = "";
  }
  const base = String(custom || DEFAULT_BRIDGE).trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(base) ? base : DEFAULT_BRIDGE;
}

/** Reads one saved setting, falling back when unset or unavailable. */
export async function readSetting<T>(providerContext: ProviderContext, key: string, fallback: T): Promise<T> {
  try {
    const value = await providerContext.kvStore?.get<T>(key);
    return value === undefined || value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

/** Catalog refs the user chose to hide (empty = show every catalog). */
export async function hiddenCatalogs(providerContext: ProviderContext): Promise<string[]> {
  const value = await readSetting<string[]>(providerContext, "cncverse_hideCatalogs", []);
  return Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : [];
}

/** Blank-title lookups cost one /meta request each, so they can be disabled. */
export async function lookupTitlesEnabled(providerContext: ProviderContext): Promise<boolean> {
  return (await readSetting<boolean>(providerContext, "cncverse_lookupTitles", true)) !== false;
}

export const RESOLUTIONS = ["2160", "1080", "720", "480", "360"];

/** Null means "do not filter" (the user cleared every option). */
export async function allowedResolutions(providerContext: ProviderContext): Promise<string[] | null> {
  const value = await readSetting<string[]>(providerContext, "cncverse_resolutions", RESOLUTIONS);
  if (!Array.isArray(value)) return null;
  const list = value.filter(item => typeof item === "string" && item);
  return list.length ? list : null;
}

/**
 * Vega passes a single opaque string between posts -> meta -> stream, so the
 * Stremio media type is carried alongside the addon id: `other|cnc:...`.
 */
export function makeRef(type: string, id: string): string {
  return `${type}|${id}`;
}

export function parseRef(link: string): { type: string; id: string } {
  const value = String(link || "").trim();
  const index = value.indexOf("|");
  if (index === -1) return { type: "other", id: value };
  return { type: value.slice(0, index), id: value.slice(index + 1) };
}

function decodeUtf8(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    let cp = b;
    if (b >= 0xf0 && i + 2 < bytes.length) {
      cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    } else if (b >= 0xe0 && i + 1 < bytes.length) {
      cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    } else if (b >= 0xc0 && i < bytes.length) {
      cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
    }
    if (cp > 0xffff) {
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      out += String.fromCharCode(cp);
    }
  }
  return out;
}

function toObject(data: unknown): any {
  if (typeof data === "string") return JSON.parse(data);
  if (data && typeof data === "object") {
    if (ArrayBuffer.isView(data)) {
      const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      return JSON.parse(decodeUtf8(view));
    }
    if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
      return JSON.parse(decodeUtf8(new Uint8Array(data)));
    }
    return data;
  }
  throw new Error("CNCVerse: unexpected response body");
}

/** GET a bridge JSON endpoint with a hard timeout. */
export async function getJson(
  providerContext: ProviderContext,
  path: string,
  signal?: AbortSignal,
  timeout = 60000,
): Promise<any> {
  const base = await getBridge(providerContext);
  const response = await providerContext.axios.get(base + path, {
    headers: { ...providerContext.commonHeaders, Accept: "application/json" },
    signal,
    timeout,
  });
  return toObject(response?.data);
}

/** Runs `fn` over `items` with at most `limit` in flight; failures become null. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index], index);
      } catch {
        results[index] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/** Strips emoji/unicode decorations CloudStream plugins put in stream names. */
export function cleanLabel(value: string): string {
  return String(value || "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True for "", "⠀" (braille blank) and other invisible placeholders. */
export function isBlankTitle(value: unknown): boolean {
  const text = String(value || "");
  return !text.replace(/[\s\u200b-\u200f\u2800-\u28ff\ufe0f]/g, "").length;
}

export function parseQuality(name?: string, filename?: string): string | undefined {
  const haystack = `${name || ""} ${filename || ""}`;
  if (/\b(2160p|4k|uhd)\b/i.test(haystack)) return "2160";
  if (/\b1080p\b/i.test(haystack)) return "1080";
  if (/\b720p\b/i.test(haystack)) return "720";
  if (/\b480p\b/i.test(haystack)) return "480";
  if (/\b360p\b/i.test(haystack)) return "360";
  return undefined;
}

export function detectStreamType(url: string, filename?: string): string {
  const path = String(url || "").split("?")[0].toLowerCase();
  const file = String(filename || "").toLowerCase();
  if (path.endsWith(".m3u8") || file.includes(".m3u8")) return "m3u8";
  if (path.endsWith(".mpd")) return "mpd";
  if (path.endsWith(".mkv") || file.endsWith(".mkv")) return "mkv";
  if (path.endsWith(".mp4") || file.endsWith(".mp4")) return "mp4";
  return "mp4";
}

/** Turns "🎬FourKHDHub ❄️ 4K • CNCVerse Bridge" into "FourKHDHub". */
export function serverName(name?: string): string {
  const head = cleanLabel(String(name || "").split("•")[0]);
  const quality = head.match(/\b(2160p|4k|uhd|1080p|720p|480p|360p|auto)\b/i);
  const server = (quality && quality.index ? head.slice(0, quality.index) : head).trim();
  return server || "CNCVerse";
}

export interface StreamHints {
  filename?: string;
  videoSize?: number;
  headers?: Record<string, string>;
}

/**
 * `behaviorHints` arrives either as a JSON object or as a Kotlin/Java
 * `toString()` of a map (`{'filename': 'x', 'videoSize': 123}`), so both
 * shapes are read here.
 */
export function readHints(raw: unknown): StreamHints {
  const hints: StreamHints = {};
  if (!raw) return hints;
  if (typeof raw === "object") {
    const obj = raw as any;
    if (typeof obj.filename === "string") hints.filename = obj.filename;
    if (typeof obj.videoSize === "number") hints.videoSize = obj.videoSize;
    const request = obj.proxyHeaders?.request;
    const headers = request?.headers && typeof request.headers === "object" ? request.headers : request;
    if (headers && typeof headers === "object") {
      const out: Record<string, string> = {};
      for (const key of Object.keys(headers)) {
        const value = headers[key];
        if (typeof value === "string" && key && !/[\r\n]/.test(key + value)) out[key] = value;
      }
      if (Object.keys(out).length) hints.headers = out;
    }
    return hints;
  }
  const text = String(raw);
  const filename = text.match(/'filename'\s*:\s*'((?:[^'\\]|\\.)*)'/);
  if (filename) hints.filename = filename[1].replace(/\\'/g, "'");
  const size = text.match(/'videoSize'\s*:\s*(\d+)/);
  if (size) hints.videoSize = Number(size[1]);
  const start = text.indexOf("proxyHeaders");
  if (start !== -1) {
    const out: Record<string, string> = {};
    const pairs = /'([^']+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
    pairs.lastIndex = start;
    let match: RegExpExecArray | null;
    while ((match = pairs.exec(text))) {
      const key = match[1];
      const value = match[2].replace(/\\'/g, "'");
      if (/^(request|response|headers|proxyHeaders)$/i.test(key)) continue;
      if (!key || /[\r\n]/.test(key + value)) continue;
      out[key] = value;
    }
    if (Object.keys(out).length) hints.headers = out;
  }
  return hints;
}

/** Reads a list that may be an array, a JSON array string or a Kotlin list string. */
export function readList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(item => (typeof item === "string" ? item : item?.name || "")).filter(Boolean);
  }
  const text = String(raw);
  if (text.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(item => (typeof item === "string" ? item : item?.name || "")).filter(Boolean);
      }
    } catch {
      // Kotlin toString() below
    }
  }
  const out: string[] = [];
  const quoted = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(text))) {
    const value = (match[1] ?? match[2] ?? "").replace(/\\(['"\\])/g, "$1");
    if (value) out.push(value);
  }
  return out;
}

/** Cast names from `cast` (the full list) or `app_extras.cast`. */
export function readCast(meta: any): string[] {
  const names: string[] = readList(meta?.cast);
  if (!names.length) {
    const extras = meta?.app_extras;
    if (extras && typeof extras === "object") {
      for (const item of Array.isArray(extras.cast) ? extras.cast : []) {
        const name = typeof item === "string" ? item : item?.name;
        if (name) names.push(String(name));
      }
    } else if (typeof extras === "string") {
      const namePattern = /'name'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
      let match: RegExpExecArray | null;
      while ((match = namePattern.exec(extras))) names.push(match[1].replace(/\\'/g, "'"));
    }
  }
  const unique: string[] = [];
  for (const name of names) {
    const clean = name.trim();
    if (clean && unique.indexOf(clean) === -1) unique.push(clean);
  }
  return unique.slice(0, 20);
}

/** Pulls an IMDb id out of metahub/logo/thumbnail URLs. */
export function findImdbId(meta: any, videos: any[]): string {
  const parts: string[] = [];
  for (const key of ["logo", "poster", "background", "id"]) if (typeof meta?.[key] === "string") parts.push(meta[key]);
  for (const video of videos) if (typeof video?.thumbnail === "string") parts.push(video.thumbnail);
  const match = parts.join(" ").match(/tt\d{7,10}/);
  return match ? match[0] : "";
}

export interface TitleEntry {
  n: string;
  p: string;
  t: number;
}

const TITLES_KEY = "cncverse_titles";
const TITLES_MAX = 800;

export async function readTitles(providerContext: ProviderContext): Promise<Record<string, TitleEntry>> {
  try {
    const stored = await providerContext.kvStore?.get<Record<string, TitleEntry>>(TITLES_KEY);
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

export async function rememberTitles(
  providerContext: ProviderContext,
  entries: { id: string; title: string; poster?: string }[],
): Promise<void> {
  const fresh = entries.filter(entry => entry.id && entry.title);
  if (!fresh.length) return;
  try {
    const map = await readTitles(providerContext);
    const now = Date.now();
    let changed = false;
    for (const entry of fresh) {
      const old = map[entry.id];
      if (old && old.n === entry.title && (!entry.poster || old.p === entry.poster)) continue;
      map[entry.id] = { n: entry.title, p: entry.poster || old?.p || "", t: now };
      changed = true;
    }
    if (!changed) return;
    const ids = Object.keys(map);
    if (ids.length > TITLES_MAX) {
      ids.sort((a, b) => (map[b]?.t || 0) - (map[a]?.t || 0));
      for (const id of ids.slice(TITLES_MAX)) delete map[id];
    }
    await providerContext.kvStore?.set(TITLES_KEY, map);
  } catch {
    // A cache miss only costs a title lookup later.
  }
}

export async function titleFor(providerContext: ProviderContext, id: string): Promise<TitleEntry | undefined> {
  const map = await readTitles(providerContext);
  return map[id];
}

export interface BridgeCatalog {
  type: string;
  id: string;
  name: string;
}

const MANIFEST_KEY = "cncverse_manifest";
const MANIFEST_TTL = 3 * 60 * 60 * 1000;

const FALLBACK_CATALOGS: BridgeCatalog[] = [
  { type: "other", id: "cnc_VegaMovies_other", name: "VegaMovies" },
  { type: "other", id: "cnc_HDHub4U_other", name: "HDHub4U" },
  { type: "other", id: "cnc_4KHDHUB_other", name: "4K HDHUB" },
  { type: "other", id: "cnc_Movies4u_other", name: "Movies4u" },
  { type: "other", id: "cnc_Netflix_other", name: "Netflix" },
  { type: "other", id: "cnc_PrimeVideo_other", name: "Prime Video" },
  { type: "other", id: "cnc_Hotstar_other", name: "Hotstar" },
  { type: "other", id: "cnc_MovieBoxIN_other", name: "MovieBoxIN" },
  { type: "tv", id: "cnc_JioTvPlus_tv", name: "Jio Tv +" },
  { type: "tv", id: "cnc_ClownIPTV_tv", name: "Clown IPTV" },
];

/** Catalog list from the addon manifest, cached in kvStore. */
export async function bridgeCatalogs(
  providerContext: ProviderContext,
  signal?: AbortSignal,
  timeout = 30000,
): Promise<BridgeCatalog[]> {
  try {
    const cached = await providerContext.kvStore?.get<{ t: number; list: BridgeCatalog[] }>(MANIFEST_KEY);
    if (cached?.list?.length && Date.now() - (cached.t || 0) < MANIFEST_TTL) return cached.list;
  } catch {
    // fall through to the network
  }
  try {
    const manifest = await getJson(providerContext, "/manifest.json", signal, timeout);
    const list: BridgeCatalog[] = (Array.isArray(manifest?.catalogs) ? manifest.catalogs : [])
      .filter((item: any) => item && typeof item.id === "string" && typeof item.type === "string")
      .map((item: any) => ({ type: item.type, id: item.id, name: String(item.name || item.id) }));
    if (list.length) {
      try {
        await providerContext.kvStore?.set(MANIFEST_KEY, { t: Date.now(), list });
      } catch {
        // cache is optional
      }
      return list;
    }
  } catch {
    // use fallback below
  }
  return FALLBACK_CATALOGS;
}

/** "VegaMovies (other)" -> "VegaMovies". */
export function catalogTitle(name: string): string {
  return String(name || "").replace(/\s*\((other|tv|movie|series)\)\s*$/i, "").trim();
}
