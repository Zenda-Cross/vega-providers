import { ProviderContext, Stream } from "../types";

export const getStream = async function ({
  link,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const parts = link.split("-");
    if (parts.length < 3) {
      throw new Error(`Invalid Genga link format: ${link}`);
    }

    const tmdbId = parts[0];
    const season = parts[1];
    const episode = parts[2];

    const url = `https://test.blakiteapi.xyz/api/get.php?id=${season}-${episode}&tmdbId=${tmdbId}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://test.blakiteapi.xyz/",
    };

    const res = await fetch(url, { headers });
    const json = await res.json();

    if (!json.success || !json.data) {
      return [];
    }

    const data = json.data;
    const dataId = data.dataId;
    const formatType = data.format || "M3U8";
    const ranges = data.ranges || "";
    const qid = data.qid || 5;

    if (!dataId) {
      return [];
    }

    const rangeMap: Record<string, string> = {};
    if (formatType === "M3U8" && ranges) {
      const lines = ranges.split("\n");
      lines.forEach((line: string) => {
        const match = line.trim().match(/^(\d+-\d+)\s*\(([^)]+)\)/);
        if (match) {
          rangeMap[match[2]] = match[1];
        }
      });
    }

    const qualityLabels = ["240p", "360p", "480p", "720p", "1080p"];
    const qualityCodes = ["oaa", "baa", "caa", "gaa", "haa"];
    const maxIdx = Math.min(qid, qualityLabels.length) - 1;
    const streams: Stream[] = [];

    for (let i = 0; i <= maxIdx; i++) {
      const label = qualityLabels[i];
      const code = qualityCodes[i];

      let streamUrl = "";
      if (formatType === "M3U8") {
        const rRange = rangeMap[label] || "";
        streamUrl = `https://hugh.cdn.rumble.cloud/video/${dataId}.${code}.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl`;
        if (rRange) {
          streamUrl += `&r_range=${rRange}`;
        }
      } else {
        streamUrl = `https://hugh.cdn.rumble.cloud/video/${dataId}.${code}.mp4`;
      }

      streams.push({
        server: `Genga-Rumble-${label}`,
        link: streamUrl,
        type: formatType === "M3U8" ? "m3u8" : "mp4",
        quality: label.replace("p", "") as any,
      });
    }

    return streams;
  } catch (err) {
    console.error("Genga getStream error:", err);
    return [];
  }
};
