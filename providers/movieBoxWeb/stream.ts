import { getBaseUrl } from "../getBaseUrl";
import { ProviderContext, Stream, TextTracks } from "../types";
import { throwProviderError } from "../providerErrors";
import { absoluteUrl, decodeLink, providerValue } from "./utils";

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
    const response = await fetch(url, {
      headers: { ...requestHeaders, "User-Agent": userAgent, Referer: referer },
    });
    if (!response.ok) return [];

    const data = await response.json();
    return mapCaptions(data?.data?.captions || []);
  } catch {
    return [];
  }
}

async function fetchPlayData(
  apiBase: string,
  params: URLSearchParams,
  refererUrl: string,
  ua: string,
): Promise<any | null> {
  const playUrl = absoluteUrl(
    apiBase,
    `/wefeed-h5api-bff/subject/play?${params.toString()}`,
  );
  const response = await fetch(playUrl, {
    headers: { ...requestHeaders, "User-Agent": ua, Referer: refererUrl },
  }).catch(() => null);

  if (!response) return null;

  // HTTP 406 is the server application response when no content representation is available
  if (response.status === 406) {
    return { noContent: true };
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} | URL ${playUrl}`,
    );
  }

  const json = await response.json().catch(() => null);
  if (json?.code === 406 || json?.message?.includes("find no content")) {
    return { noContent: true };
  }
  return json;
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const playback = decodeLink(link);
    const baseUrl = await getBaseUrl(providerValue);
    const userAgent =
      providerContext?.commonHeaders?.["User-Agent"] || defaultUserAgent;
    const streamHeaders = {
      Referer: `${baseUrl}/`,
      Origin: baseUrl,
      "User-Agent": userAgent,
    };
    const watchParams = new URLSearchParams({
      id: playback.subjectId,
      type: "/movie/detail",
      detailSe: playback.season ? String(playback.season) : "",
      detailEp: playback.episode ? String(playback.episode) : "",
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
    if (playback.season && playback.episode) {
      playParams.set("se", String(playback.season));
      playParams.set("ep", String(playback.episode));
    }

    let playResult = await fetchPlayData(baseUrl, playParams, referer, userAgent);

    // If no content found and fallback subjectId/detailPath is available, try fallback
    if (
      (!playResult || playResult.noContent || playResult.code !== 0) &&
      (playback.fallbackSubjectId || playback.fallbackDetailPath)
    ) {
      const fbSubjectId = playback.fallbackSubjectId || playback.subjectId;
      const fbDetailPath = playback.fallbackDetailPath || playback.detailPath;
      const fbParams = new URLSearchParams({
        subjectId: fbSubjectId,
        detailPath: fbDetailPath,
      });
      if (playback.season && playback.episode) {
        fbParams.set("se", String(playback.season));
        fbParams.set("ep", String(playback.episode));
      }
      const fbWatchParams = new URLSearchParams({
        id: fbSubjectId,
        type: "/movie/detail",
        detailSe: playback.season ? String(playback.season) : "",
        detailEp: playback.episode ? String(playback.episode) : "",
        lang: "en",
      });
      const fbReferer = absoluteUrl(
        baseUrl,
        `/movies/${fbDetailPath}?${fbWatchParams}`,
      );
      const fbResult = await fetchPlayData(baseUrl, fbParams, fbReferer, userAgent).catch(
        () => null,
      );
      if (
        fbResult &&
        !fbResult.noContent &&
        fbResult.code === 0 &&
        fbResult.data?.streams?.length
      ) {
        playResult = fbResult;
      }
    }

    if (
      !playResult ||
      playResult.noContent ||
      playResult.data?.hasResource === false
    ) {
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
        ),
        headers: streamHeaders,
      })),
    );
  } catch (error) {
    throwProviderError("MovieBox Web", "stream", error);
  }
};
