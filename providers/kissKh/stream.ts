import { Stream, ProviderContext, TextTracks } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { generateKisskhKey, getKisskhConfig } from "./keyGenerator";

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
    const { axios, commonHeaders } = providerContext;
    const streamLinks: Stream[] = [];
    const subtitles: TextTracks = [];

    let baseUrl = "https://kisskh.is";
    try {
      const resolved = await getBaseUrl("kissKh");
      if (resolved) {
        baseUrl = resolved.replace(/\/+$/, "");
      }
    } catch {}

    let episodeId = link.trim();
    if (episodeId.includes("ep=")) {
      const match = episodeId.match(/[?&]ep=([0-9]+)/);
      if (match) episodeId = match[1];
    } else if (episodeId.includes("/Episode/")) {
      const match = episodeId.match(/\/Episode\/([0-9]+)/);
      if (match) episodeId = match[1];
    }

    const config = await getKisskhConfig(axios, baseUrl);
    const streamKey = generateKisskhKey(
      episodeId,
      config.viGuid,
      config.appVer,
      config.platformVer,
      config.appName
    );
    const subKey = generateKisskhKey(
      episodeId,
      config.subGuid,
      config.appVer,
      config.platformVer,
      config.appName
    );

    const headers: Record<string, string> = {
      ...(commonHeaders || {}),
      Accept: "application/json, text/plain, */*",
      Referer: `${baseUrl}/`,
      Origin: baseUrl,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    try {
      const subUrl = `${baseUrl}/api/Sub/${episodeId}?kkey=${subKey}`;
      const subRes = await axios.get(subUrl, {
        headers,
        signal,
        timeout: 8000,
      });
      const subData = Array.isArray(subRes.data) ? subRes.data : [];
      for (const sub of subData) {
        if (sub?.src) {
          subtitles.push({
            title: sub.label || "Subtitle",
            language: sub.land || sub.label || "en",
            type: sub.src.includes(".vtt")
              ? "text/vtt"
              : "application/x-subrip",
            uri: sub.src,
          });
        }
      }
    } catch {}

    const streamUrl = `${baseUrl}/api/DramaList/Episode/${episodeId}.png?err=false&ts=null&time=null&kkey=${streamKey}`;
    const res = await axios.get(streamUrl, {
      headers,
      responseType: "json",
      signal,
      timeout: 10000,
    });

    let resData = res.data;
    if (typeof resData === "string") {
      try {
        resData = JSON.parse(resData);
      } catch {}
    }

    if (resData?.Video) {
      const videoUrl: string = resData.Video;
      const isM3u8 = videoUrl.includes(".m3u8") || resData.Type === 1;
      const qualityMatch = videoUrl.match(/\b(360|480|720|1080|2160)p?\b/i);
      const quality = qualityMatch
        ? qualityMatch[1]
        : videoUrl.includes(".mp4")
        ? "1080"
        : "auto";

      let variantsFound = false;
      if (isM3u8) {
        try {
          const playlistRes = await axios.get(videoUrl, {
            headers: {
              Referer: `${baseUrl}/`,
              Origin: baseUrl,
            },
            signal,
            timeout: 5000,
          });
          const playlistText =
            typeof playlistRes.data === "string" ? playlistRes.data : "";
          if (playlistText.includes("#EXT-X-STREAM-INF:")) {
            const lines = playlistText.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
                const resMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/i);
                const varQuality = resMatch ? resMatch[1] : "auto";
                const nextLine = lines[i + 1]?.trim();
                if (nextLine && !nextLine.startsWith("#")) {
                  const varUrl = nextLine.startsWith("http")
                    ? nextLine
                    : new URL(nextLine, videoUrl).href;
                  streamLinks.push({
                    server: `KissKH (${varQuality}p)`,
                    link: varUrl,
                    type: "m3u8",
                    quality: varQuality,
                    subtitles,
                    headers: {
                      Referer: `${baseUrl}/`,
                      Origin: baseUrl,
                    },
                  });
                  variantsFound = true;
                }
              }
            }
          }
        } catch {}
      }

      if (!variantsFound) {
        streamLinks.push({
          server: "KissKH",
          link: videoUrl,
          type: isM3u8 ? "m3u8" : "mp4",
          quality,
          subtitles,
          headers: {
            Referer: `${baseUrl}/`,
            Origin: baseUrl,
          },
        });
      }
    }

    if (resData?.Video_tmp) {
      const videoUrl: string = resData.Video_tmp;
      streamLinks.push({
        server: "KissKH (Backup)",
        link: videoUrl,
        type: videoUrl.includes(".m3u8") ? "m3u8" : "mp4",
        quality: "auto",
        subtitles,
        headers: {
          Referer: `${baseUrl}/`,
          Origin: baseUrl,
        },
      });
    }

    if (isDownload) {
      streamLinks.sort((a, b) => {
        if (a.type === "mp4" && b.type !== "mp4") return -1;
        if (a.type !== "mp4" && b.type === "mp4") return 1;
        return 0;
      });
    }

    return streamLinks;
  } catch (err) {
    console.error("kisskh getStream error:", err);
    return [];
  }
};
