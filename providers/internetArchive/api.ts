import { ProviderContext, TextTracks } from "../types";

export const IA_BASE = "https://archive.org";

// Only items whose uploader marked them public domain or Creative Commons.
// creativecommons.org/publicdomain/... matches both patterns.
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

// Sort orders offered in the provider settings; "downloads" is the default.
const SORT_ORDERS: Record<string, string> = {
  downloads: "downloads desc",
  addeddate: "addeddate desc",
  avg_rating: "avg_rating desc",
};

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

// Drops the characters that change the meaning of a Lucene query.
export const sanitizeQuery = (text: string): string =>
  text.replace(/[\\+\-!(){}\[\]^"~*?:\/&|]/g, " ").replace(/\s+/g, " ").trim();

export const imageUrl = (identifier: string): string =>
  `${IA_BASE}/services/img/${encodeURIComponent(identifier)}`;

export const fileUrl = (identifier: string, fileName: string): string =>
  `${IA_BASE}/download/${encodeURIComponent(identifier)}/${fileName
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

// Links are "identifier" for a whole item or "identifier/fileName" for one
// video inside an item that holds several (e.g. TV episodes).
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

export const fetchItem = async (
  identifier: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<ArchiveItem> => {
  const res = await providerContext.axios.get(
    `${IA_BASE}/metadata/${encodeURIComponent(identifier)}`,
    { headers: providerContext.commonHeaders, signal },
  );
  if (!res.data?.metadata) {
    throw new Error(`Internet Archive item not found: ${identifier}`);
  }
  return { metadata: res.data.metadata, files: res.data.files || [] };
};

// Metadata fields can be a string or an array of strings.
export const firstValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value == null ? "" : String(value);
};

export const isVideoFile = (file: ArchiveFile): boolean => {
  const name = file.name.toLowerCase();
  if (name.includes(".thumbs/")) return false;
  return VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const EPISODE_NAME = /s\d{1,2}\s*e\d{1,3}|\bep(isode)?[\s._-]*\d+|\bpart[\s._-]*\d+|\bchapter[\s._-]*\d+|\b\d{1,2}x\d{2}\b/i;
const TV_COLLECTIONS = ["classic_tv", "television"];

// An item with several uploads is either a show (one upload per episode) or
// one film uploaded in several versions (e.g. "iPod" and "PS3" encodes).
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

// Groups an item's video files by the original upload they come from, so each
// group is one movie, episode or version with all its derived formats.
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

// --- subtitles ---------------------------------------------------------------

const SUBTITLE_TYPES: Record<string, TextTracks[number]["type"]> = {
  ".srt": "application/x-subrip",
  ".vtt": "text/vtt",
};

// Language words and codes seen in subtitle file names -> [ISO 639-1, name].
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

// "Film.en.srt", "Film_english.vtt", "Film (Spanish).srt" -> language. Only
// the last word counts, so a title like "It Happened One Night" is not Italian.
export const subtitleLanguage = (fileName: string): [string, string] | undefined => {
  const words = baseName(fileName).toLowerCase().split(/[\s._()\[\]-]+/).filter(Boolean);
  return LANGUAGES[words[words.length - 1] ?? ""];
};

// Subtitles for one video: files named after it (episodes), or every
// subtitle in the item when there is only one film.
export const subtitleTracks = (
  identifier: string,
  files: ArchiveFile[],
  video?: string,
): TextTracks => {
  const subtitles = files.filter(isSubtitleFile);
  const videoBase = video ? baseName(video).toLowerCase() : "";
  // "Ep1.en.srt" belongs to "Ep1.mp4", but "Ep10.srt" does not.
  const belongsToVideo = (name: string): boolean => {
    const base = baseName(name).toLowerCase();
    return base === videoBase || (base.startsWith(videoBase) && /[\s._(\[-]/.test(base[videoBase.length]));
  };
  const matching = videoBase ? subtitles.filter((f) => belongsToVideo(f.name)) : subtitles;
  // Seen on archive.org: empty files, and the same captions as both .srt and
  // .vtt. Skip the empty ones and keep one file per name, preferring WebVTT.
  const byName = new Map<string, ArchiveFile>();
  for (const file of matching) {
    if (file.size !== undefined && Number(file.size) === 0) continue;
    const key = baseName(file.name).toLowerCase();
    const kept = byName.get(key);
    if (!kept || (extensionOf(file.name) === ".vtt" && extensionOf(kept.name) !== ".vtt")) {
      byName.set(key, file);
    }
  }
  return [...byName.values()].map((file) => {
    // Internet Archive makes "<name>.asr.srt" itself, by speech recognition.
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
