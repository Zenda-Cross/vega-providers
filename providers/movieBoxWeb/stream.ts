import { ProviderContext, Stream, TextTracks } from "../types";
import { throwProviderError } from "../providerErrors";
import {
  absoluteUrl,
  decodeLink,
  getProviderBaseUrl,
  parseNuxtDetail,
} from "./utils";

type PlayStream = {
  format?: string;
  id?: string;
  url?: string;
  resolutions?: string;
  vipLocked?: boolean;
};

type Caption = {
  lan?: string;
  lanName?: string;
  url?: string;
};

const defaultUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const requestHeaders = {
  // This provider uses the public anonymous API, not a saved website session.
  // An explicit empty token overrides that cookie in the app's author jar.
  Cookie: "token=",
  Accept: "application/json",
  "User-Agent": defaultUserAgent,
  "x-client-info": JSON.stringify({ timezone: "Asia/Colombo" }),
  "x-source": "",
};

function getQuality(resolutions?: string): Stream["quality"] {
  const values = (resolutions || "")
    .split(",")
    .map(Number)
    .filter((value) => [360, 480, 720, 1080, 2160].includes(value));
  const quality = Math.max(...values);
  return Number.isFinite(quality)
    ? (String(quality) as Stream["quality"])
    : undefined;
}

function getStreamType(format?: string, url?: string): string {
  const normalized = format?.toUpperCase();
  if (normalized === "HLS" || normalized === "M3U8") return "m3u8";
  if (normalized === "DASH" || normalized === "MPD") return "mpd";
  if (url) {
    const cleanUrl = url.split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".m3u8")) return "m3u8";
    if (cleanUrl.endsWith(".mpd")) return "mpd";
  }
  return "mp4";
}

function mapCaptions(captions: Caption[]): TextTracks {
  return captions
    .filter((caption) => Boolean(caption.url))
    .map((caption) => ({
      title: caption.lanName || caption.lan || "Subtitle",
      language: caption.lan || "und",
      type: caption.url?.includes(".vtt")
        ? ("text/vtt" as const)
        : ("application/x-subrip" as const),
      uri: caption.url || "",
    }));
}

async function getCaptions(
  baseUrl: string,
  playback: ReturnType<typeof decodeLink>,
  stream: PlayStream,
  referer: string,
  userAgent: string = defaultUserAgent,
  providerContext?: ProviderContext,
  signal?: AbortSignal,
): Promise<TextTracks> {
  try {
    if (!stream.id || !stream.format) return [];

    const params = new URLSearchParams({
      format: stream.format,
      id: stream.id,
      subjectId: playback.subjectId,
      detailPath: playback.detailPath,
    });
    const url = absoluteUrl(
      baseUrl,
      `/wefeed-h5api-bff/subject/caption?${params}`,
    );
    const headers = { ...requestHeaders, "User-Agent": userAgent, Referer: referer };

    if (providerContext?.axios) {
      const res = await providerContext.axios.get(url, {
        headers,
        signal,
        timeout: 10000,
        validateStatus: () => true,
      });
      if (res.status >= 200 && res.status < 300) {
        return mapCaptions(res.data?.data?.captions || []);
      }
      return [];
    }

    const response = await fetch(url, { headers, signal });
    if (!response.ok) return [];

    const data = await response.json();
    return mapCaptions(data?.data?.captions || []);
  } catch {
    return [];
  }
}

function hasPlayableStreams(result: any): boolean {
  if (!result || result.noContent || result.code !== 0 || result.data?.hasResource === false) {
    return false;
  }
  const sources = [
    ...(result.data?.streams || []),
    ...(result.data?.hls || []),
    ...(result.data?.dash || []),
  ] as PlayStream[];
  return sources.some((s) => Boolean(s?.url && !s?.vipLocked));
}

class MovieBoxPlaybackLimitError extends Error {}

function checkPlaybackLimit(result: any): void {
  if (result?.data?.limited && !hasPlayableStreams(result)) {
    throw new MovieBoxPlaybackLimitError(
      "MovieBox is limiting playback for this session. Please try again later.",
    );
  }
}

async function fetchPlayData(
  apiBase: string,
  params: URLSearchParams,
  refererUrl: string,
  ua: string,
  providerContext?: ProviderContext,
  signal?: AbortSignal,
): Promise<any | null> {
  const playUrl = absoluteUrl(
    apiBase,
    `/wefeed-h5api-bff/subject/play?${params.toString()}`,
  );
  const headers = {
    ...requestHeaders,
    "User-Agent": ua,
    Referer: refererUrl,
  };
  try {
    if (providerContext?.axios) {
      const res = await providerContext.axios.get(playUrl, {
        headers,
        signal,
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status === 429) {
        throw new MovieBoxPlaybackLimitError("MovieBox is temporarily rate limiting playback. Please try again later.");
      }
      if (res.status === 406) return { noContent: true };
      if (res.status < 200 || res.status >= 300) {
        console.warn(`[movieBoxWeb] Play API HTTP ${res.status} for ${playUrl}`);
        return null;
      }
      const json = res.data;
      checkPlaybackLimit(json);
      if (json?.code === 406 || json?.message?.includes("find no content")) {
        return { noContent: true };
      }
      return json;
    }

    const response = await fetch(playUrl, {
      headers,
      signal,
    });
    if (response.status === 429) {
      throw new MovieBoxPlaybackLimitError("MovieBox is temporarily rate limiting playback. Please try again later.");
    }
    if (response.status === 406) {
      return { noContent: true };
    }
    if (!response.ok) {
      console.warn(`[movieBoxWeb] Play API HTTP ${response.status} for ${playUrl}`);
      return null;
    }
    const json = await response.json();
    checkPlaybackLimit(json);
    if (json?.code === 406 || json?.message?.includes("find no content")) {
      return { noContent: true };
    }
    return json;
  } catch (err: any) {
    if (err instanceof MovieBoxPlaybackLimitError) throw err;
    console.warn(`[movieBoxWeb] Play API fetch error for ${playUrl}:`, err?.message || err);
    return null;
  }
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    const playback = decodeLink(link);
    const baseUrl = await getProviderBaseUrl();
    const userAgent =
      providerContext?.commonHeaders?.["User-Agent"] || defaultUserAgent;
    const streamHeaders = {
      Referer: `${baseUrl}/`,
      Origin: baseUrl,
      "User-Agent": userAgent,
    };

    if (!playback.subjectId && playback.detailPath) {
      try {
        const detailUrl = absoluteUrl(baseUrl, `/moviesDetail/${playback.detailPath}`);
        const res = await fetch(detailUrl);
        if (res.ok) {
          const detail = parseNuxtDetail(await res.text(), providerContext.cheerio);
          if (detail?.subject?.subjectId) {
            playback.subjectId = detail.subject.subjectId;
            if (!playback.fallbackSubjectId) {
              playback.fallbackSubjectId = detail.subject.subjectId;
            }
          }
        }
      } catch (e: any) {
        console.warn("[movieBoxWeb] Failed to resolve missing subjectId:", e?.message || e);
      }
    }

    const isSeries = Boolean(
      (playback.season !== undefined && playback.season > 0) ||
      (playback.seasons && playback.seasons.some((s) => (s.se || 0) > 0))
    );

    const seasonNumber =
      playback.season !== undefined
        ? playback.season
        : (playback.seasons?.find((s) => (s.se || 0) > 0)?.se || 1);

    const episodeNumber =
      playback.episode !== undefined
        ? playback.episode
        : 1;

    const watchParams = new URLSearchParams({
      id: playback.subjectId,
      type: "/movie/detail",
      detailSe: isSeries && seasonNumber > 0 ? String(seasonNumber) : "",
      detailEp: isSeries && episodeNumber > 0 ? String(episodeNumber) : "",
      lang: "en",
    });
    const referer = absoluteUrl(
      baseUrl,
      `/movies/${playback.detailPath}?${watchParams}`,
    );
    const playParams = new URLSearchParams({
      subjectId: playback.subjectId,
      detailPath: playback.detailPath,
    });
    if (isSeries && seasonNumber > 0) {
      playParams.set("se", String(seasonNumber));
      playParams.set("ep", String(episodeNumber));
    }

    let playResult = await fetchPlayData(
      baseUrl,
      playParams,
      referer,
      userAgent,
      providerContext,
      signal,
    );

    // If no playable streams found and fallback subjectId/detailPath is available, try fallback
    if (
      !hasPlayableStreams(playResult) &&
      (playback.fallbackSubjectId || playback.fallbackDetailPath)
    ) {
      const fbSubjectId = playback.fallbackSubjectId || playback.subjectId;
      const fbDetailPath = playback.fallbackDetailPath || playback.detailPath;
      const fbParams = new URLSearchParams({
        subjectId: fbSubjectId,
        detailPath: fbDetailPath,
      });
      if (isSeries && seasonNumber > 0) {
        fbParams.set("se", String(seasonNumber));
        fbParams.set("ep", String(episodeNumber));
      }
      const fbWatchParams = new URLSearchParams({
        id: fbSubjectId,
        type: "/movie/detail",
        detailSe: isSeries && seasonNumber > 0 ? String(seasonNumber) : "",
        detailEp: isSeries && episodeNumber > 0 ? String(episodeNumber) : "",
        lang: "en",
      });
      const fbReferer = absoluteUrl(
        baseUrl,
        `/movies/${fbDetailPath}?${fbWatchParams}`,
      );
      const fbResult = await fetchPlayData(
        baseUrl,
        fbParams,
        fbReferer,
        userAgent,
        providerContext,
        signal,
      );
      if (hasPlayableStreams(fbResult)) {
        playResult = fbResult;
      }
    }

    // If still no playable streams, try without se/ep
    if (!hasPlayableStreams(playResult)) {
      const cleanParams = new URLSearchParams({
        subjectId: playback.subjectId,
        detailPath: playback.detailPath,
      });
      const cleanResult = await fetchPlayData(
        baseUrl,
        cleanParams,
        referer,
        userAgent,
        providerContext,
        signal,
      );
      if (hasPlayableStreams(cleanResult)) {
        playResult = cleanResult;
      }
    }

    if (
      !playResult ||
      playResult.noContent ||
      playResult.data?.hasResource === false
    ) {
      console.warn("[movieBoxWeb] No playable resource found for:", playback.detailPath);
      return [];
    }

    if (playResult.code !== 0) {
      throw new Error(
        playResult.message || `MovieBox Web play API code ${playResult.code}`,
      );
    }

    const playData = playResult.data;
    if (!playData) return [];

    const sources = [
      ...(playData.streams || []),
      ...(playData.hls || []),
      ...(playData.dash || []),
    ] as PlayStream[];
    const availableSources = sources.filter(
      (source) => source.url && !source.vipLocked,
    );

    console.log("MovieBox Web stream sources", availableSources);
    return Promise.all(
      availableSources.map(async (source) => ({
        server:
          `${playback.language} ${source.resolutions || source.format || ""}`.trim(),
        link: source.url || "",
        type: getStreamType(source.format, source.url),
        quality: getQuality(source.resolutions),
        subtitles: await getCaptions(
          baseUrl,
          playback,
          source,
          referer,
          userAgent,
          providerContext,
          signal,
        ),
        headers: streamHeaders,
      })),
    );
  } catch (error) {
    throwProviderError("MovieBox Web", "stream", error);
  }
};
