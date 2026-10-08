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

async function fetchFromInstance(
  axios: any,
  baseUrl: string,
  videoId: string,
  signal?: AbortSignal
): Promise<Stream[]> {
  const apiUrl = `${baseUrl.replace(/\/+$/, "")}/api/v1/videos/${videoId}`;
  const res = await axios.get(apiUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
    timeout: 3000,
    signal,
  });

  const data = res.data;
  if (!data) return [];

  const streams: Stream[] = [];
  const seenUrls = new Set<string>();

  // Extract subtitles/captions
  const subtitles: TextTracks = [];
  if (Array.isArray(data.captions)) {
    for (const c of data.captions) {
      if (c.url && c.label) {
        subtitles.push({
          title: c.label,
          language: c.languageCode || c.label,
          type: "text/vtt",
          uri: c.url.startsWith("http") ? c.url : `${baseUrl.replace(/\/+$/, "")}${c.url}`,
        });
      }
    }
  }

  // 1. Regular combined formatStreams
  if (Array.isArray(data.formatStreams)) {
    for (const f of data.formatStreams) {
      if (f.url && !seenUrls.has(f.url)) {
        seenUrls.add(f.url);
        const qualityStr = f.resolution
          ? f.resolution.replace("p", "")
          : f.quality || "720";
        streams.push({
          server: `YouTube Direct (${f.resolution || qualityStr + "p"})`,
          link: f.url,
          type: f.container || "mp4",
          quality: qualityStr,
          subtitles: subtitles.length > 0 ? subtitles : undefined,
        });
      }
    }
  }

  // 2. Adaptive video formats
  if (Array.isArray(data.adaptiveFormats)) {
    for (const f of data.adaptiveFormats) {
      if (
        f.url &&
        f.type &&
        f.type.startsWith("video/") &&
        !seenUrls.has(f.url)
      ) {
        seenUrls.add(f.url);
        const qual = f.qualityLabel || f.resolution || "HD";
        const qualityStr = qual.replace("p", "");
        streams.push({
          server: `YouTube Stream (${qual})`,
          link: f.url,
          type: f.container || "mp4",
          quality: qualityStr,
          subtitles: subtitles.length > 0 ? subtitles : undefined,
        });
      }
    }
  }

  // 3. Audio stream option
  const audioFormat = (data.adaptiveFormats || []).find(
    (f: any) => f.url && f.type && f.type.startsWith("audio/")
  );
  if (audioFormat && !seenUrls.has(audioFormat.url)) {
    seenUrls.add(audioFormat.url);
    streams.push({
      server: "YouTube Audio Only",
      link: audioFormat.url,
      type: audioFormat.container || "m4a",
      quality: "Audio",
    });
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

  const customInstance = await kvStore?.get<string>("invidiousInstance");
  const preferredQuality = await kvStore?.get<string>("preferredQuality");

  const instances = [
    customInstance,
    "https://invidious.f5.si",
    "https://inv.nadeko.net",
    "https://yewtu.be",
    "https://invidious.nerdvpn.de",
  ].filter(Boolean) as string[];

  // Race instances in parallel so requests never get stuck sequentially
  try {
    const promises = instances.map((inst) =>
      fetchFromInstance(axios, inst, videoId, signal).then((results) => {
        if (results && results.length > 0) return results;
        throw new Error("No streams returned");
      })
    );

    const streams = await Promise.any(promises);

    if (streams && streams.length > 0) {
      streams.sort((a, b) => {
        if (preferredQuality && preferredQuality !== "auto") {
          const cleanPref = preferredQuality.replace("p", "");
          if (a.quality === cleanPref && b.quality !== cleanPref) return -1;
          if (b.quality === cleanPref && a.quality !== cleanPref) return 1;
        }

        const orderA = QUALITY_ORDER[a.quality || ""] || 99;
        const orderB = QUALITY_ORDER[b.quality || ""] || 99;
        return orderA - orderB;
      });

      return streams;
    }
  } catch {
    // If all public instances fail or time out, return empty gracefully without hanging
  }

  return [];
};
