import { throwProviderError } from "../providerErrors";
import { ProviderContext, SkipInterval, Stream, TextTracks } from "../types";
import {
  buildWatchUrl,
  callServerFn,
  parseWatchUrl,
  resolveBaseUrl,
  SERVER_FNS,
} from "./client";
import { resolveFlixCloudMkv } from "./flixcloud";

interface PlaybackResponse {
  ok?: boolean;
  error?: string;
  data?: {
    fileCode?: string;
    streamUrl?: string;
    server?: number;
    audio?: string;
    audios?: string[];
    subtitles?: Array<{
      label?: string;
      url?: string;
      type?: string;
      language?: string;
      default?: boolean;
    }>;
    chapters?: Array<{
      title?: string;
      start?: number;
      end?: number;
      type?: string;
    }>;
  };
}

function mapSubtitleType(rawType?: string, uri?: string): TextTracks[number]["type"] {
  const normalized = String(rawType || "").toLowerCase();
  const cleanUri = String(uri || "").toLowerCase();
  if (normalized === "vtt" || cleanUri.includes(".vtt")) return "text/vtt";
  if (normalized === "ttml" || cleanUri.includes(".ttml")) {
    return "application/ttml+xml";
  }
  if (
    normalized === "ass" ||
    normalized === "ssa" ||
    cleanUri.includes(".ass") ||
    cleanUri.includes(".ssa")
  ) {
    // React Native Video ExoPlayer passes MIME types directly to Media3 SubtitleConfiguration;
    // "text/x-ssa" enables native ASS/SSA rendering instead of misparsing as SubRip.
    return "text/x-ssa" as TextTracks[number]["type"];
  }
  return "application/x-subrip";
}

function mapSubtitles(rawSubs: any[] | undefined): TextTracks | undefined {
  if (!Array.isArray(rawSubs) || rawSubs.length === 0) return undefined;

  const tracks: TextTracks = [];
  const seenUris = new Set<string>();

  for (const sub of rawSubs) {
    const uri = typeof sub?.url === "string" ? sub.url.trim() : "";
    if (!uri || seenUris.has(uri)) continue;
    seenUris.add(uri);

    tracks.push({
      title: String(sub.label || sub.language || "Subtitle").trim(),
      language: String(sub.language || "und").trim(),
      type: mapSubtitleType(sub.type, uri),
      uri,
    });
  }

  if (tracks.length === 0) return undefined;

  // Prefer SRT/VTT first when available alongside ASS tracks.
  tracks.sort((a, b) => {
    const rank = (t: string) =>
      t === "application/x-subrip" ? 0 : t === "text/vtt" ? 1 : 2;
    return rank(a.type) - rank(b.type);
  });

  return tracks;
}

function mapChaptersToSkip(chapters: any[] | undefined): SkipInterval[] | undefined {
  if (!Array.isArray(chapters) || chapters.length === 0) return undefined;

  const skipTypes = new Set([
    "intro",
    "op",
    "mixed-op",
    "outro",
    "ed",
    "mixed-ed",
    "recap",
    "prologue",
    "preview",
  ]);

  const intervals: SkipInterval[] = [];

  for (const ch of chapters) {
    const chType = String(ch?.type || "").toLowerCase();
    if (!chType || !skipTypes.has(chType)) continue;

    const from = Number(ch.start);
    const to = Number(ch.end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;

    const defaultTitle =
      chType === "outro" || chType === "ed" || chType === "mixed-ed"
        ? "Credits"
        : chType === "recap"
          ? "Recap"
          : chType === "preview"
            ? "Preview"
            : chType === "prologue"
              ? "Prologue"
              : "Intro";

    intervals.push({
      title: ch.title || defaultTitle,
      from: Number(from.toFixed(2)),
      to: Number(to.toFixed(2)),
    });
  }

  return intervals.length > 0 ? intervals : undefined;
}

function formatAudioLabel(audio: string | undefined, isDub: boolean): string {
  if (audio === "dual") return " (Dual Audio)";
  if (isDub || audio === "dub" || audio === "english") return " (Dub)";
  return " (Sub)";
}

async function fetchPlayback(
  anilistId: number,
  episode: number,
  dub: boolean,
  server: number,
  options: {
    providerContext: ProviderContext;
    signal?: AbortSignal;
    baseUrl: string;
    referer: string;
  },
): Promise<{ dub: boolean; server: number; pb: PlaybackResponse } | null> {
  try {
    const pb = await callServerFn<PlaybackResponse>(
      SERVER_FNS.PLAYBACK,
      { anilistId, episode, dub: Boolean(dub), server },
      options,
    );
    if (pb?.ok && pb.data) {
      return { dub, server, pb };
    }
    return null;
  } catch {
    return null;
  }
}

export const getStream = async function ({
  link,
  signal,
  providerContext,
  isDownload = false,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    const baseUrl = await resolveBaseUrl();
    const { anilistId, episode, hasDub } = parseWatchUrl(link);
    const referer = buildWatchUrl(baseUrl, anilistId, episode);
    const reqOptions = { providerContext, signal, baseUrl, referer };

    const subResults = (
      await Promise.all([
        fetchPlayback(anilistId, episode, false, 1, reqOptions),
        fetchPlayback(anilistId, episode, false, 2, reqOptions),
      ])
    ).filter((r): r is NonNullable<typeof r> => Boolean(r));

    const hasDualAudio = subResults.some(
      (r) =>
        r.pb.data?.audio === "dual" ||
        (Array.isArray(r.pb.data?.audios) && r.pb.data.audios.includes("dual")),
    );
    const hasSeparateDub =
      !hasDualAudio &&
      (hasDub ||
        subResults.some(
          (r) =>
            Array.isArray(r.pb.data?.audios) &&
            r.pb.data.audios.some((a) => a === "dub" || a === "english"),
        ));

    const dubResults = hasSeparateDub
      ? (
          await Promise.all([
            fetchPlayback(anilistId, episode, true, 1, reqOptions),
            fetchPlayback(anilistId, episode, true, 2, reqOptions),
          ])
        ).filter((r): r is NonNullable<typeof r> => Boolean(r))
      : [];

    const allResults = [...subResults, ...dubResults];
    if (allResults.length === 0) {
      throw new Error(`No playback sources found for AniList ${anilistId} episode ${episode}`);
    }

    if (isDownload) {
      const seenCodes = new Set<string>();
      const downloadTargets: Array<{
        fileCode: string;
        audioLabel: string;
        skip?: SkipInterval[];
      }> = [];

      for (const entry of allResults) {
        const data = entry.pb.data;
        const fileCode = String(data?.fileCode || "").trim();
        if (!fileCode || seenCodes.has(fileCode)) continue;
        seenCodes.add(fileCode);

        downloadTargets.push({
          fileCode,
          audioLabel: formatAudioLabel(data?.audio, entry.dub),
          skip: mapChaptersToSkip(data?.chapters),
        });
      }

      if (downloadTargets.length === 0) {
        throw new Error("No FlixCloud download codes available for this episode");
      }

      const resolvedStreams: Stream[] = [];
      let lastError: unknown = null;

      for (const target of downloadTargets) {
        try {
          const mkv = await resolveFlixCloudMkv(target.fileCode, {
            providerContext,
            signal,
          });
          resolvedStreams.push({
            server: `FlixCloud MKV${mkv.sizeHuman ? ` (${mkv.sizeHuman})` : ""}${target.audioLabel}`,
            link: mkv.url,
            type: "mkv",
            ...(mkv.quality ? { quality: mkv.quality } : {}),
            ...(mkv.sizeHuman ? { tag: mkv.sizeHuman } : {}),
            ...(target.skip ? { skip: target.skip } : {}),
          });
        } catch (err) {
          lastError = err;
        }
      }

      if (resolvedStreams.length === 0 && lastError) {
        throw lastError;
      }

      return resolvedStreams;
    }

    const streams: Stream[] = [];
    const seenUrls = new Set<string>();

    for (const entry of allResults) {
      const data = entry.pb.data;
      const streamUrl = typeof data?.streamUrl === "string" ? data.streamUrl.trim() : "";
      if (!streamUrl || seenUrls.has(streamUrl)) continue;
      seenUrls.add(streamUrl);

      const subtitles = mapSubtitles(data?.subtitles);
      const skip = mapChaptersToSkip(data?.chapters);
      const audioLabel = formatAudioLabel(data?.audio, entry.dub);

      streams.push({
        server: `Server ${entry.server}${audioLabel}`,
        link: streamUrl,
        type: "m3u8",
        ...(subtitles ? { subtitles } : {}),
        ...(skip ? { skip } : {}),
      });
    }

    return streams;
  } catch (err) {
    throwProviderError("AniDream", "stream", err);
  }
};
