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

  // VISIONOS Client - extracts Master HLS .m3u8 manifest
  try {
    const visionRes = await axios.post(
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

    const vData = visionRes?.data;
    const masterUrl = vData?.streamingData?.hlsManifestUrl;

    if (masterUrl) {
      // 1. Master HLS (Multi-Quality adaptive stream)
      streams.push({
        server: "YouTube HLS (Multi-Quality)",
        link: masterUrl,
        type: "m3u8",
        quality: "1080",
        tag: "Audio + Video",
      });

      // 2. Parse individual resolution variants from master manifest
      try {
        const manifestRes = await axios.get(masterUrl, {
          timeout: 4000,
          signal,
        });
        const manifestText =
          typeof manifestRes?.data === "string" ? manifestRes.data : "";
        const lines = manifestText.split("\n");

        const variantsByRes = new Map<
          string,
          { height: string; bandwidth: number; isAvc: boolean; url: string }
        >();
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("#EXT-X-STREAM-INF")) {
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
            const bwMatch = line.match(/BANDWIDTH=(\d+)/);
            const nextUrl = lines[i + 1]?.trim();
            if (resMatch && nextUrl && nextUrl.startsWith("http")) {
              const height = resMatch[2]; // e.g. 1080, 720, 480, 360, 240, 144
              const bandwidth = parseInt(bwMatch ? bwMatch[1] : "0", 10);
              const isAvc = line.includes("avc1");
              const existing = variantsByRes.get(height);
              if (
                !existing ||
                (isAvc && !existing.isAvc) ||
                (isAvc === existing.isAvc && bandwidth > existing.bandwidth)
              ) {
                variantsByRes.set(height, {
                  height,
                  bandwidth,
                  isAvc,
                  url: nextUrl,
                });
              }
            }
          }
        }

        // Add individual resolution HLS streams in descending quality order
        const sortedHeights = Array.from(variantsByRes.keys()).sort(
          (a, b) => parseInt(b, 10) - parseInt(a, 10)
        );
        for (const h of sortedHeights) {
          const v = variantsByRes.get(h)!;
          streams.push({
            server: `YouTube HLS (${h}p)`,
            link: v.url,
            type: "m3u8",
            quality: h,
            tag: "Audio + Video",
          });
        }
      } catch {
        // Continue with available streams
      }
    }

    // Extract subtitles
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
  } catch {
    // Return empty on failure
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
    // Quality preference matching
    if (preferredQuality && preferredQuality !== "auto") {
      const cleanPref = preferredQuality.replace("p", "");
      const aMatches = a.quality === cleanPref;
      const bMatches = b.quality === cleanPref;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    } else if (!preferredQuality || preferredQuality === "auto") {
      if (
        a.server.includes("Multi-Quality") &&
        !b.server.includes("Multi-Quality")
      )
        return -1;
      if (
        !a.server.includes("Multi-Quality") &&
        b.server.includes("Multi-Quality")
      )
        return 1;
    }

    const orderA = QUALITY_ORDER[a.quality || ""] || 99;
    const orderB = QUALITY_ORDER[b.quality || ""] || 99;
    return orderA - orderB;
  });
}
