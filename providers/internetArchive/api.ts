import { ProviderContext, TextTracks } from "../types";

export const IA_BASE = "https://archive.org";

const LICENSE_FILTERS: Record<string, string> = {
  publicDomain: "licenseurl:*publicdomain*",
  open: "licenseurl:(*publicdomain* OR *creativecommons*)",
};

const VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mkv", ".webm", ".ogv", ".mov", ".avi", ".mpeg", ".mpg"];

export interface ArchiveFile {
  name: string;
  format?: string;
  source?: string;
  original?: string;
  size?: string;
  height?: string;
  length?: string;
}

export interface ArchiveItem {
  metadata: Record<string, any>;
  files: ArchiveFile[];
}

const SORT_ORDERS: Record<string, string> = {
  downloads: "downloads desc",
  addeddate: "addeddate desc",
  avg_rating: "avg_rating desc",
  newest: "date desc",
  oldest: "date asc",
  title: "titleSorter asc",
};

const QUALITY_CHOICES = ["1080", "720", "480", "360"];

export const getSortOrder = async (providerContext: ProviderContext): Promise<string> => {
  const choice = await providerContext.kvStore?.get<string>("sort");
  return SORT_ORDERS[choice || "downloads"] || SORT_ORDERS.downloads;
};

export const getLicenseFilter = async (
  providerContext: ProviderContext,
): Promise<string> => {
  const choice = await providerContext.kvStore?.get<string>("licenses");
  return LICENSE_FILTERS[choice || "open"] || LICENSE_FILTERS.open;
};

export const getPreferredHeight = async (
  providerContext: ProviderContext,
): Promise<number> => {
  const choice = await providerContext.kvStore?.get<string>("quality");
  return choice && QUALITY_CHOICES.includes(choice) ? Number(choice) : 0;
};

export const buildSearchUrl = (
  query: string,
  page: number,
  rows = 24,
  sort = SORT_ORDERS.downloads,
): string => {
  const fields = ["identifier", "title", "year", "downloads"]
    .map((f) => `fl[]=${f}`)
    .join("&");
  return (
    `${IA_BASE}/advancedsearch.php?q=${encodeURIComponent(query)}` +
    `&${fields}&sort[]=${encodeURIComponent(sort)}` +
    `&rows=${rows}&page=${page}&output=json`
  );
};

export const sanitizeQuery = (text: string): string =>
  text.replace(/[\\+\-!(){}\[\]^"~*?:\/&|]/g, " ").replace(/\s+/g, " ").trim();

export const parseSearch = (text: string): { words: string; year?: string } => {
  const cleaned = sanitizeQuery(text);
  const match = cleaned.match(/(?:^|\s)((?:18|19|20)\d{2})$/);
  if (!match) return { words: cleaned };
  return {
    words: cleaned.slice(0, cleaned.length - match[0].length).trim(),
    year: match[1],
  };
};

export const buildSearchQuery = (text: string): string => {
  const { words, year } = parseSearch(text);
  const parts: string[] = [];
  if (words) parts.push(`(title:(${words}) OR creator:(${words}))`);
  if (year) parts.push(`year:${year}`);
  return parts.join(" AND ");
};

export const imageUrl = (identifier: string): string =>
  `${IA_BASE}/services/img/${encodeURIComponent(identifier)}`;

export const fileUrl = (identifier: string, fileName: string): string =>
  `${IA_BASE}/download/${encodeURIComponent(identifier)}/${fileName
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

export const parseLink = (
  link: string,
): { identifier: string; fileName?: string } => {
  const path = link.replace(/^https?:\/\/(www\.)?archive\.org\/(details|download)\//, "");
  const slash = path.indexOf("/");
  if (slash === -1) return { identifier: decodeURIComponent(path) };
  return {
    identifier: decodeURIComponent(path.slice(0, slash)),
    fileName: decodeURIComponent(path.slice(slash + 1)),
  };
};

const isRetryable = (error: any): boolean => {
  if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return false;
  const status = error?.response?.status;
  return !status || status === 429 || status >= 500;
};

export const getWithRetry = async (
  url: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
  attempts = 2,
): Promise<any> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) break;
    try {
      return await providerContext.axios.get(url, {
        headers: providerContext.commonHeaders,
        signal,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
    }
  }
  throw lastError ?? new Error("Internet Archive request was cancelled");
};

export const fetchItem = async (
  identifier: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<ArchiveItem> => {
  const res = await getWithRetry(
    `${IA_BASE}/metadata/${encodeURIComponent(identifier)}`,
    providerContext,
    signal,
  );
  if (!res.data?.metadata) {
    throw new Error(`Internet Archive item not found: ${identifier}`);
  }
  return { metadata: res.data.metadata, files: res.data.files || [] };
};

export const firstValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value == null ? "" : String(value);
};

export const listValues = (value: unknown): string[] =>
  ([] as unknown[])
    .concat(value ?? [])
    .flatMap((entry) => String(entry).split(";"))
    .map((entry) => entry.trim())
    .filter(Boolean);

export const parseDuration = (length?: string): number => {
  if (!length) return 0;
  if (length.includes(":")) {
    return length
      .split(":")
      .reduce((total, part) => total * 60 + (Number(part) || 0), 0);
  }
  return Number(length) || 0;
};

export const formatRuntime = (seconds: number): string => {
  if (!seconds || seconds < 60) return "";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const isVideoFile = (file: ArchiveFile): boolean => {
  const name = file.name.toLowerCase();
  if (name.includes(".thumbs/")) return false;
  return VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const EPISODE_NAME = /s\d{1,2}\s*e\d{1,3}|\bep(isode)?[\s._-]*\d+|\bpart[\s._-]*\d+|\bchapter[\s._-]*\d+|\b\d{1,2}x\d{2}\b/i;
const TV_COLLECTIONS = ["classic_tv", "television"];

export const isEpisodeList = (
  originals: string[],
  metadata: Record<string, any>,
): boolean => {
  if (originals.length < 2) return false;
  const collections = ([] as string[]).concat(metadata.collection || []);
  if (collections.some((c) => TV_COLLECTIONS.some((tv) => c.startsWith(tv)))) {
    return true;
  }
  const named = originals.filter((name) => EPISODE_NAME.test(name)).length;
  return named >= Math.ceil(originals.length / 2);
};

export const groupVideos = (files: ArchiveFile[]): Map<string, ArchiveFile[]> => {
  const groups = new Map<string, ArchiveFile[]>();
  for (const file of files.filter(isVideoFile)) {
    const key = file.source === "derivative" && file.original ? file.original : file.name;
    const group = groups.get(key) || [];
    group.push(file);
    groups.set(key, group);
  }
  return new Map(
    [...groups.entries()].sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true }),
    ),
  );
};

const SUBTITLE_TYPES: Record<string, TextTracks[number]["type"]> = {
  ".srt": "application/x-subrip",
  ".vtt": "text/vtt",
};

const LANGUAGES: Record<string, [string, string]> = {};
for (const [code, name, ...aliases] of [
  ["en", "English", "eng", "english"],
  ["es", "Spanish", "spa", "spanish", "espanol"],
  ["fr", "French", "fre", "fra", "french", "francais"],
  ["de", "German", "ger", "deu", "german", "deutsch"],
  ["it", "Italian", "ita", "italian", "italiano"],
  ["pt", "Portuguese", "por", "portuguese", "portugues"],
  ["nl", "Dutch", "dut", "nld", "dutch"],
  ["ru", "Russian", "rus", "russian"],
  ["ar", "Arabic", "ara", "arabic"],
  ["hi", "Hindi", "hin", "hindi"],
  ["ur", "Urdu", "urd", "urdu"],
  ["tr", "Turkish", "tur", "turkish"],
  ["zh", "Chinese", "chi", "zho", "chinese"],
  ["ja", "Japanese", "jpn", "japanese"],
  ["ko", "Korean", "kor", "korean"],
]) {
  for (const key of [code, ...aliases]) LANGUAGES[key] = [code, name];
}

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

const baseName = (name: string): string =>
  name.replace(/^.*\//, "").replace(/\.[^.]+$/, "");

export const isSubtitleFile = (file: ArchiveFile): boolean =>
  !file.name.toLowerCase().includes(".thumbs/") && extensionOf(file.name) in SUBTITLE_TYPES;

export const subtitleLanguage = (fileName: string): [string, string] | undefined => {
  const words = baseName(fileName).toLowerCase().split(/[\s._()\[\]-]+/).filter(Boolean);
  return LANGUAGES[words[words.length - 1] ?? ""];
};

export const subtitleTracks = (
  identifier: string,
  files: ArchiveFile[],
  video?: string,
): TextTracks => {
  const subtitles = files.filter(isSubtitleFile);
  const pathStem = (name: string): string => name.replace(/\.[^/.]+$/, "").toLowerCase();
  const videoBase = video ? pathStem(video) : "";
  const belongsToVideo = (name: string): boolean => {
    const base = pathStem(name);
    return base === videoBase || (base.startsWith(videoBase) && /[\s._(\[-]/.test(base[videoBase.length]));
  };
  const matching = videoBase ? subtitles.filter((f) => belongsToVideo(f.name)) : subtitles;
  const byName = new Map<string, ArchiveFile>();
  for (const file of matching) {
    if (file.size !== undefined && Number(file.size) === 0) continue;
    const key = pathStem(file.name);
    const kept = byName.get(key);
    if (!kept || (extensionOf(file.name) === ".vtt" && extensionOf(kept.name) !== ".vtt")) {
      byName.set(key, file);
    }
  }
  return [...byName.values()].map((file) => {
    const automatic = /\.asr$/i.test(baseName(file.name));
    const language = subtitleLanguage(automatic ? baseName(file.name) : file.name);
    const name = language ? language[1] : baseName(file.name).replace(/_+/g, " ");
    return {
      title: automatic ? `Automatic captions${language ? ` (${language[1]})` : ""}` : name,
      language: language ? language[0] : "und",
      type: SUBTITLE_TYPES[extensionOf(file.name)],
      uri: fileUrl(identifier, file.name),
    };
  });
};
