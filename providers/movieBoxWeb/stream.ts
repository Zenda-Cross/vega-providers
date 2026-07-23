import { getBaseUrl } from "../getBaseUrl";
import { ProviderContext, Stream, TextTracks } from "../types";
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

const requestHeaders = {
  Accept: "application/json",
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

function getStreamType(format?: string): string {
  const normalized = format?.toUpperCase();
  if (normalized === "HLS" || normalized === "M3U8") return "m3u8";
  if (normalized === "DASH") return "mpd";
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
): Promise<TextTracks> {
  if (!stream.id || !stream.format) return [];

  const params = new URLSearchParams({
    format: stream.format,
    id: stream.id,
    subjectId: playback.subjectId,
    detailPath: playback.detailPath,
  });
  const response = await fetch(
    absoluteUrl(baseUrl, `/wefeed-h5api-bff/subject/caption?${params}`),
    { headers: { ...requestHeaders, Referer: referer } },
  );
  if (!response.ok) return [];

  const data = await response.json();
  return mapCaptions(data?.data?.captions || []);
}

export const getStream = async function ({
  link,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const playback = decodeLink(link);
    const baseUrl = await getBaseUrl(providerValue);
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

    const response = await fetch(
      absoluteUrl(baseUrl, `/wefeed-h5api-bff/subject/play?${playParams}`),
      { headers: { ...requestHeaders, Referer: referer } },
    );
    if (!response.ok) return [];

    const data = await response.json();
    const playData = data?.data;
    if (data?.code !== 0 || !playData?.hasResource) return [];

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
        type: getStreamType(source.format),
        quality: getQuality(source.resolutions),
        subtitles: await getCaptions(baseUrl, playback, source, referer),
        headers: { Referer: baseUrl, Origin: baseUrl },
      })),
    );
  } catch (error) {
    console.error("MovieBox Web stream error", error);
    return [];
  }
};
