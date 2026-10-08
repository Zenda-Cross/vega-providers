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

async function fetchFromInnerTube(
  axios: any,
  videoId: string,
  signal?: AbortSignal
): Promise<Stream[]> {
  const streams: Stream[] = [];
  const subtitles: TextTracks = [];

  // 1. iOS Client - provides Master HLS .m3u8 manifest with multi-quality adaptive streaming & full audio
  try {
    const iosRes = await axios.post(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        context: {
          client: {
            clientName: "IOS",
            clientVersion: "20.11.6",
            deviceModel: "iPhone10,4",
            osName: "iOS",
            osVersion: "16.7.7.20H330",
          },
        },
        videoId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
        },
        timeout: 4500,
        signal,
      }
    );

    const iosData = iosRes?.data;
    if (iosData?.streamingData?.hlsManifestUrl) {
      streams.push({
        server: "YouTube HLS (Multi-Quality)",
        link: iosData.streamingData.hlsManifestUrl,
        type: "m3u8",
        quality: "1080",
        tag: "Audio + Video",
        headers: {
          "User-Agent":
            "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
        },
      });
    }

    // Extract subtitles if present
    const captionTracks =
      iosData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
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
  } catch {
    // Continue to Android client
  }

  // 2. Android Client - provides muxed direct video+audio MP4s and high-res adaptive streams
  try {
    const androidRes = await axios.post(
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
        timeout: 4500,
        signal,
      }
    );

    const aData = androidRes?.data;
    if (aData?.playabilityStatus?.status === "OK" && aData?.streamingData) {
      // Subtitles fallback if iOS didn't have them
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

      // Muxed formats (combined audio+video directly inside the MP4 container)
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
            subtitles: subtitles.length > 0 ? subtitles : undefined,
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
              subtitles: subtitles.length > 0 ? subtitles : undefined,
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
  } catch {
    // Continue
  }

  // Attach subtitles to HLS stream if present
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

  // Direct client InnerTube API (runs 100% locally on device IP)
  try {
    const directStreams = await fetchFromInnerTube(axios, videoId, signal);
    if (directStreams && directStreams.length > 0) {
      sortStreams(directStreams, preferredQuality);
      return directStreams;
    }
  } catch {
    // Return empty if extraction fails
  }

  return [];
};

function sortStreams(streams: Stream[], preferredQuality?: string) {
  streams.sort((a, b) => {
    // Prioritize streams with audio over video-only or audio-only
    const aHasBoth = a.tag === "Audio + Video";
    const bHasBoth = b.tag === "Audio + Video";
    if (aHasBoth && !bHasBoth) return -1;
    if (!aHasBoth && bHasBoth) return 1;

    // Put HLS Master first unless a specific quality is preferred
    if (!preferredQuality || preferredQuality === "auto") {
      if (a.type === "m3u8" && b.type !== "m3u8") return -1;
      if (b.type === "m3u8" && a.type !== "m3u8") return 1;
    } else {
      const cleanPref = preferredQuality.replace("p", "");
      if (a.quality === cleanPref && b.quality !== cleanPref) return -1;
      if (b.quality === cleanPref && a.quality !== cleanPref) return 1;
    }

    const orderA = QUALITY_ORDER[a.quality || ""] || 99;
    const orderB = QUALITY_ORDER[b.quality || ""] || 99;
    return orderA - orderB;
  });
}
