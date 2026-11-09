import { Stream, ProviderContext, TextTracks } from "../types";

function extractVideoId(link: string): string {
  const match =
    link.match(/(?:v=|\/watch\?v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/i) ||
    link.match(/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : link;
}

const QUALITY_ORDER: Record<string, number> = {
  "2160": 1,
  "1440": 2,
  "1080": 3,
  "720": 4,
  "480": 5,
  "360": 6,
  "240": 7,
  "144": 8,
};

async function getVisitorData(axios: any, kvStore: any): Promise<string> {
  const fallback =
    "CgtSdHczNXdoNzhqQSiYoJ7WBjIKCgJJThIEGgAgZGLfAgrcAjIyLllUPUpQRHNlLWd6ZzYwc3FRN2JRSGNlMzdJWHFlelQxLUZMd00yR3M5X1gxZUd4RWtRdUxyakphLS1iaU1LMk9fcU83MHl4cExXcFRKd3p2ckcxcGMyU0RBS3FmYXVPOGpnd1dpWUtUdU5rQ1pZZzFZeHh3UkFnRXYtNE9YR1gtaWhvd2RvblQ3dENIV0NmdDgtZU9Ibi04M2QtUlBoZlhoZGpyNjE4YlFGY0VWVU5UanJBZ2g0cVFCRXJWbktnQm4tV1Eydm1CNE5qTl9FajBQVV9TaFlsYkxEOGY3WFJaUGVNRnIzTzhoejEyMDJQQlJpRUwyX1gtV2N0WG1YRmFvLVYyZXRpTWJDSUZLaU9jNEZUTU1lSktrWVBKV1A0WlV5eFZYeTNPZUlFMS1XeXpaa1Y3T1dVVDE5SllHcTNSN0NFcE5HNTNFZElmcW9UVDdMYjV2N09mdw==";
  try {
    const cached = await kvStore?.get("youtube_visitor_data");
    if (cached) return cached;

    const res = await axios.get("https://www.youtube.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 3000,
    });
    const match =
      typeof res?.data === "string"
        ? res.data.match(/"visitorData"\s*:\s*"([^"]+)"/)
        : null;
    if (match && match[1]) {
      await kvStore?.set("youtube_visitor_data", match[1]);
      return match[1];
    }
  } catch {
    // Return fallback on network error
  }
  return fallback;
}

function extractCaptions(data: any): TextTracks {
  const subtitles: TextTracks = [];
  const captionTracks =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (Array.isArray(captionTracks)) {
    for (const c of captionTracks) {
      if (c.baseUrl) {
        const name =
          c.name?.runs?.[0]?.text || c.name?.simpleText || c.languageCode;
        subtitles.push({
          title: name,
          language: c.languageCode || name,
          type: "text/vtt",
          uri: c.baseUrl.includes("fmt=") ? c.baseUrl : `${c.baseUrl}&fmt=vtt`,
        });
      }
    }
  }
  return subtitles;
}

async function fetchFromInnerTube(
  axios: any,
  kvStore: any,
  videoId: string,
  signal?: AbortSignal
): Promise<{ streams: Stream[]; subtitles: TextTracks }> {
  const streams: Stream[] = [];
  let subtitles: TextTracks = [];

  const visitorData = await getVisitorData(axios, kvStore);

  try {
    const [visionRes, vrRes] = await Promise.allSettled([
      axios.post(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json",
        {
          videoId,
          racyCheckOk: true,
          contentCheckOk: true,
          playbackContext: {
            contentPlaybackContext: {
              signatureTimestamp: 20731,
            },
          },
          context: {
            client: {
              hl: "en",
              gl: "US",
              visitorData,
              clientName: "VISIONOS",
              clientVersion: "1.02",
              osName: "visionOS",
              osVersion: "26.5.23O471",
              platform: "MOBILE",
              deviceMake: "Apple",
              deviceModel: "RealityDevice17,1",
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-YouTube-Client-Name": "101",
            "X-YouTube-Client-Version": "1.02",
            "X-Goog-Visitor-Id": visitorData,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
            Origin: "https://www.youtube.com",
            Referer: `https://www.youtube.com/watch?v=${videoId}`,
          },
          timeout: 5000,
          signal,
        }
      ),
      axios.post(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json",
        {
          videoId,
          racyCheckOk: true,
          contentCheckOk: true,
          playbackContext: {
            contentPlaybackContext: {
              signatureTimestamp: 20731,
            },
          },
          context: {
            client: {
              clientName: "ANDROID_VR",
              clientVersion: "1.60.19",
              deviceMake: "Oculus",
              deviceModel: "Quest 3",
              platform: "MOBILE",
              hl: "en",
              gl: "US",
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36",
          },
          timeout: 5000,
          signal,
        }
      ),
    ]);

    const vData = visionRes.status === "fulfilled" ? visionRes.value?.data : null;
    const vrData = vrRes.status === "fulfilled" ? vrRes.value?.data : null;

    // 1. Master HLS (Multi-Quality adaptive stream with audio)
    const masterUrl = vData?.streamingData?.hlsManifestUrl;
    if (masterUrl) {
      streams.push({
        server: "YouTube HLS (Multi-Quality)",
        link: masterUrl,
        type: "m3u8",
        quality: "1080",
        tag: "Audio + Video",
      });
    }

    // 2. Progressive MP4 (Audio + Video muxed)
    const formats = vrData?.streamingData?.formats || [];
    for (const f of formats) {
      if (f.url) {
        const qualityLabel = f.qualityLabel || "360p";
        streams.push({
          server: `YouTube (${qualityLabel} MP4)`,
          link: f.url,
          type: "mp4",
          quality: qualityLabel.replace("p", ""),
          tag: "Audio + Video",
        });
      }
    }

    // 3. Subtitles
    subtitles = extractCaptions(vData) || extractCaptions(vrData) || [];
  } catch {
    // Return empty on failure
  }

  return { streams, subtitles };
}

function sortStreams(
  streams: Stream[],
  preferredQuality?: string,
  isDownload?: boolean
) {
  streams.sort((a, b) => {
    // 1. If downloading, prefer standalone MP4 if available
    if (isDownload) {
      const aIsMp4 = a.type === "mp4";
      const bIsMp4 = b.type === "mp4";
      if (aIsMp4 && !bIsMp4) return -1;
      if (!aIsMp4 && bIsMp4) return 1;
    }

    // 2. If streaming, prioritize adaptive HLS
    if (!isDownload) {
      const aIsHls = a.server.includes("Multi-Quality") || a.type === "m3u8";
      const bIsHls = b.server.includes("Multi-Quality") || b.type === "m3u8";
      if (aIsHls && !bIsHls) return -1;
      if (!aIsHls && bIsHls) return 1;
    }

    // 3. Match preferred quality
    if (preferredQuality && preferredQuality !== "auto") {
      const cleanPref = preferredQuality.replace("p", "");
      const aMatches = a.quality === cleanPref;
      const bMatches = b.quality === cleanPref;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }

    // 4. Default quality order
    const orderA = QUALITY_ORDER[a.quality || ""] || 99;
    const orderB = QUALITY_ORDER[b.quality || ""] || 99;
    return orderA - orderB;
  });
}

export const getStream = async function ({
  link,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, kvStore } = providerContext;

  const videoId = extractVideoId(link);
  if (!videoId) return [];

  const preferredQuality = await kvStore?.get<string>("preferredQuality");
  const { streams, subtitles } = await fetchFromInnerTube(
    axios,
    kvStore,
    videoId,
    signal
  );

  if (streams.length === 0) {
    return [];
  }

  // Deduplicate streams
  const seenUrls = new Set<string>();
  const uniqueStreams: Stream[] = [];
  for (const s of streams) {
    if (!seenUrls.has(s.link)) {
      seenUrls.add(s.link);
      uniqueStreams.push(s);
    }
  }

  // Attach subtitles
  if (subtitles.length > 0) {
    for (const s of uniqueStreams) {
      if (!s.subtitles) {
        s.subtitles = subtitles;
      }
    }
  }

  sortStreams(uniqueStreams, preferredQuality, isDownload);
  return uniqueStreams;
};
