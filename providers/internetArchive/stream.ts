import { ProviderContext, Stream } from "../types";
import {
  ArchiveFile,
  fetchItem,
  fileUrl,
  getPreferredHeight,
  groupVideos,
  parseLink,
  subtitleTracks,
} from "./api";

const FORMAT_RANK = [".mp4", ".m4v", ".webm", ".mkv", ".ogv", ".mov", ".avi", ".mpeg", ".mpg"];

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

const formatSize = (bytes?: string): string => {
  const n = Number(bytes);
  if (!n) return "";
  return n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GB` : `${Math.round(n / 1024 ** 2)} MB`;
};

const versionName = (original: string): string =>
  original.replace(/^.*\//, "").replace(/\.[^.]+$/, "").replace(/_+/g, " ").trim();

const toStream = (
  identifier: string,
  file: ArchiveFile,
  subtitles: Stream["subtitles"],
  version?: string,
): Stream => {
  const ext = extensionOf(file.name);
  const height = Number(file.height) || 0;
  const tags = [
    height ? `${height}p` : "",
    ext.slice(1).toUpperCase(),
    file.source === "original" ? "Original" : "",
    formatSize(file.size),
  ].filter(Boolean);
  const format = file.format || ext.slice(1).toUpperCase();
  return {
    server: version ? `${format} · ${version}` : format,
    link: fileUrl(identifier, file.name),
    type: ext === ".m3u8" ? "m3u8" : "mp4",
    quality: height ? String(height) : undefined,
    tags,
    tag: tags.join(" • "),
    ...(subtitles?.length ? { subtitles } : {}),
  };
};

export const getStream = async function ({
  link,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { identifier, fileName } = parseLink(link);
  const [{ files }, preferred] = await Promise.all([
    fetchItem(identifier, providerContext, signal),
    getPreferredHeight(providerContext),
  ]);
  const groups = groupVideos(files);

  const versions = fileName
    ? [[fileName, groups.get(fileName) || []] as const]
    : [...groups.entries()];
  const labelled = versions.length > 1;
  const versionOf = new Map<ArchiveFile, string | undefined>();
  for (const [original, files] of versions) {
    for (const file of files) {
      versionOf.set(file, labelled ? versionName(original) : undefined);
    }
  }
  const videos = [...versionOf.keys()];
  if (videos.length === 0) {
    throw new Error(`No playable video in Internet Archive item: ${identifier}`);
  }

  const rank = (f: ArchiveFile) => {
    const i = FORMAT_RANK.indexOf(extensionOf(f.name));
    return i === -1 ? FORMAT_RANK.length : i;
  };
  const distance = (f: ArchiveFile) => {
    if (!preferred) return 0;
    const height = Number(f.height) || 0;
    return height ? Math.abs(height - preferred) : Number.MAX_SAFE_INTEGER;
  };
  const sorted = [...videos].sort((a, b) =>
    isDownload
      ? Number(b.size || 0) - Number(a.size || 0)
      : distance(a) - distance(b) || rank(a) - rank(b) || Number(b.height || 0) - Number(a.height || 0),
  );
  const subtitles = subtitleTracks(identifier, files, fileName);
  return sorted.map((file) => toStream(identifier, file, subtitles, versionOf.get(file)));
};
