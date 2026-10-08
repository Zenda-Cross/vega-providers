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
    // Fall back to default
  }
  return fallback;
}

async function fetchFromInnerTube(
  axios: any,
  kvStore: any,
  videoId: string,
  signal?: AbortSignal
): Promise<Stream[]> {
  const streams: Stream[] = [];
  const subtitles: TextTracks = [];

  const visitorData = await getVisitorData(axios, kvStore);

  // 1. VISIONOS Client - extracts Master HLS .m3u8 manifest (multi-quality 1080p/720p/etc. with full audio & subtitles)
  const visionPromise = axios.post(
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
  );

  // 2. Android Client - provides muxed direct video+audio MP4s and DASH tracks
  const androidPromise = axios.post(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
          androidSdkVersion: 34,
        },
      },
      videoId,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
      },
      timeout: 5000,
      signal,
    }
  );

  const [visionRes, androidRes] = await Promise.allSettled([
    visionPromise,
    androidPromise,
  ]);

  // Process VISIONOS response (Master HLS + Captions)
  if (visionRes.status === "fulfilled") {
    const vData = visionRes.value?.data;
    if (vData?.streamingData?.hlsManifestUrl) {
      streams.push({
        server: "YouTube HLS (Multi-Quality)",
        link: vData.streamingData.hlsManifestUrl,
        type: "m3u8",
        quality: "1080",
        tag: "Audio + Video",
      });
    }

    const captionTracks =
      vData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
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
  }

  // Process Android response (Muxed MP4s & DASH tracks)
  if (androidRes.status === "fulfilled") {
    const aData = androidRes.value?.data;
    if (aData?.playabilityStatus?.status === "OK" && aData?.streamingData) {
      if (subtitles.length === 0) {
        const captionTracks =
          aData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(captionTracks)) {
          for (const c of captionTracks) {
            if (c.baseUrl) {
              const name =
                c.name?.runs?.[0]?.text || c.name?.simpleText || c.languageCode;
              subtitles.push({
                title: name,
                language: c.languageCode || name,
                type: "text/vtt",
                uri: c.baseUrl.includes("fmt=")
                  ? c.baseUrl
                  : `${c.baseUrl}&fmt=vtt`,
              });
            }
          }
        }
      }

      // Muxed formats (combined audio+video inside MP4 container)
      for (const f of aData.streamingData.formats || []) {
        if (f.url) {
          const qual = f.qualityLabel || f.quality || "360p";
          const qualityStr = qual.replace("p", "");
          streams.push({
            server: `YouTube MP4 (${qual})`,
            link: f.url,
            type: "mp4",
            quality: qualityStr,
            tag: "Audio + Video",
            headers: {
              "User-Agent":
                "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
            },
          });
        }
      }

      // Adaptive video formats (separate video-only DASH tracks)
      const seenQuals = new Set<string>();
      for (const f of aData.streamingData.adaptiveFormats || []) {
        if (f.url && f.mimeType?.startsWith("video/")) {
          const qual = f.qualityLabel || "HD";
          if (!seenQuals.has(qual)) {
            seenQuals.add(qual);
            const qualityStr = qual.replace("p", "");
            streams.push({
              server: `YouTube Stream (${qual} - Video Only)`,
              link: f.url,
              type: f.mimeType.includes("webm") ? "webm" : "mp4",
              quality: qualityStr,
              tag: "Video Only",
              headers: {
                "User-Agent":
                  "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
              },
            });
          }
        }
      }

      // Audio only option
      const audioFormat = (aData.streamingData.adaptiveFormats || []).find(
        (f: any) => f.url && f.mimeType?.startsWith("audio/")
      );
      if (audioFormat) {
        streams.push({
          server: "YouTube Audio Only",
          link: audioFormat.url,
          type: audioFormat.mimeType.includes("webm") ? "webm" : "m4a",
          quality: "Audio",
          tag: "Audio Only",
          headers: {
            "User-Agent":
              "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
          },
        });
      }
    }
  }

  // Attach subtitles to streams
  if (subtitles.length > 0) {
    for (const s of streams) {
      if (!s.subtitles) s.subtitles = subtitles;
    }
  }

  return streams;
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

  try {
    const directStreams = await fetchFromInnerTube(
      axios,
      kvStore,
      videoId,
      signal
    );
    if (directStreams && directStreams.length > 0) {
      sortStreams(directStreams, preferredQuality, isDownload);
      return directStreams;
    }
  } catch {
    // Return empty if extraction fails
  }

  return [];
};

function sortStreams(
  streams: Stream[],
  preferredQuality?: string,
  isDownload?: boolean
) {
  streams.sort((a, b) => {
    // For downloads, prioritize MP4 streams with Audio + Video
    if (isDownload) {
      const aIsMuxedMp4 = a.type === "mp4" && a.tag === "Audio + Video";
      const bIsMuxedMp4 = b.type === "mp4" && b.tag === "Audio + Video";
      if (aIsMuxedMp4 && !bIsMuxedMp4) return -1;
      if (!aIsMuxedMp4 && bIsMuxedMp4) return 1;
    }

    // Prioritize streams with audio over video-only or audio-only
    const aHasBoth = a.tag === "Audio + Video";
    const bHasBoth = b.tag === "Audio + Video";
    if (aHasBoth && !bHasBoth) return -1;
    if (!aHasBoth && bHasBoth) return 1;

    // For playback, prioritize HLS Master unless a specific resolution is preferred
    if (!isDownload && (!preferredQuality || preferredQuality === "auto")) {
      if (a.type === "m3u8" && b.type !== "m3u8") return -1;
      if (b.type === "m3u8" && a.type !== "m3u8") return 1;
    } else if (preferredQuality && preferredQuality !== "auto") {
      const cleanPref = preferredQuality.replace("p", "");
      if (a.quality === cleanPref && b.quality !== cleanPref) return -1;
      if (b.quality === cleanPref && a.quality !== cleanPref) return 1;
    }

    const orderA = QUALITY_ORDER[a.quality || ""] || 99;
    const orderB = QUALITY_ORDER[b.quality || ""] || 99;
    return orderA - orderB;
  });
}
