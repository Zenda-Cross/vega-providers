import { ProviderContext, Stream, TextTracks } from "../types";

const BASE_URL = "https://kaa.lt";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function fixUrl(rawUrl: string, baseUrl: string): string {
  let trimmed = rawUrl.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    trimmed = trimmed.replace(/^(https?:)\/\/+/, "$1//");
  } else if (trimmed.startsWith("//")) {
    trimmed = "https:" + trimmed;
  } else if (trimmed.startsWith("/")) {
    try {
      const u = new URL(baseUrl);
      trimmed = `${u.origin}${trimmed}`;
    } catch {
      trimmed = `${BASE_URL}${trimmed}`;
    }
  }
  return trimmed;
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;

  let epApiUrl = link;
  let epParsed: { slug?: string; epNum?: string; epSlug?: string; lang?: string } | null = null;
  if (link.startsWith("{")) {
    try {
      const parsed = JSON.parse(link);
      epParsed = parsed;
      const slug = parsed.slug;
      const epNum = parsed.epNum;
      const epSlug = parsed.epSlug;
      const num = epNum || "1";
      epApiUrl = epSlug
        ? `${BASE_URL}/api/show/${slug}/episode/ep-${num}-${epSlug}`
        : `${BASE_URL}/api/show/${slug}/episode/ep-${num}`;
    } catch {
      // keep as link
    }
  }

  let servers: { name: string; src: string }[] = [];
  try {
    const srvRes = await axios.get(epApiUrl, { headers: defaultHeaders });
    servers = srvRes.data?.servers || [];

    if (servers.length === 0 && epParsed?.slug && epParsed.lang && epParsed.lang !== "ja-JP") {
      try {
        const num = epParsed.epNum || "1";
        const jaRes = await axios.get(
          `${BASE_URL}/api/show/${epParsed.slug}/episodes?page=1&lang=ja-JP`,
          { headers: defaultHeaders }
        );
        const jaEps = jaRes.data?.result || [];
        const matching = jaEps.find(
          (e: any) => String(e.episode_string) === String(num) || String(e.episode_number) === String(num)
        );
        if (matching?.slug) {
          const fallbackRes = await axios.get(
            `${BASE_URL}/api/show/${epParsed.slug}/episode/ep-${num}-${matching.slug}`,
            { headers: defaultHeaders }
          );
          servers = fallbackRes.data?.servers || [];
        }
      } catch {
        // fallback failed
      }
    }
  } catch {
    return [];
  }

  if (servers.length === 0) {
    return [];
  }

  const streams: Stream[] = [];

  for (const srv of servers) {
    if (!srv.src) continue;
    try {
      let src = srv.src;
      if (src.includes("/cat-player/vast")) {
        src = src.replace("/cat-player/vast", "/cat-player/player");
      }
      const playerUrl = fixUrl(src, BASE_URL);
      const playerRes = await axios.get(playerUrl, {
        headers: {
          ...defaultHeaders,
          Referer: `${BASE_URL}/`,
        },
      });

      const html = typeof playerRes.data === "string" ? playerRes.data : JSON.stringify(playerRes.data);
      const cleanHtml = html.replace(/&quot;/g, '"');

      // 1. New Player (Manifest-based)
      const manifestMatch =
        cleanHtml.match(/manifest":\[\d+,"(?:https?:)?(\/\/[^"]+)"]/);
      const directManifestMatch =
        manifestMatch || cleanHtml.match(/manifest":\[\d+,"([^"]+)"]/);

      if (directManifestMatch) {
        const rawManifest = directManifestMatch[1].split("\\").join("");
        const manifestUrl = fixUrl(rawManifest, playerUrl);

        let origin = "";
        try {
          origin = new URL(playerUrl).origin;
        } catch {
          origin = BASE_URL;
        }

        const hlsHeaders: Record<string, string> = {
          "User-Agent": defaultHeaders["User-Agent"],
          Origin: origin,
          Referer: playerUrl,
        };

        // Extract subtitles
        const subtitles: TextTracks = [];
        const trackRegex =
          /"language":\[\d+,"([^"]+)"][^}]+?"name":\[\d+,"([^"]+)"][^}]+?"src":\[\d+,"([^"]+)"]/g;
        let tMatch;
        while ((tMatch = trackRegex.exec(cleanHtml)) !== null) {
          const lang = tMatch[1];
          const subName = tMatch[2];
          const subSrc = tMatch[3].split("\\").join("");
          const subUrl = fixUrl(subSrc, playerUrl);
          const proxyUrl = `https://fetch.1proxy.workers.dev/fetch?url=${encodeURIComponent(
            subUrl
          )}&headers=${encodeURIComponent(JSON.stringify(hlsHeaders))}`;

          const isSrt = subUrl.toLowerCase().includes(".srt");
          subtitles.push({
            title: `${subName} (${lang})`,
            language: lang,
            type: isSrt ? "application/x-subrip" : "text/vtt",
            uri: proxyUrl,
          });
        }

        if (manifestUrl.includes(".m3u8")) {
          // Add Auto master stream
          streams.push({
            server: `${srv.name} (Auto)`,
            link: manifestUrl,
            type: "m3u8",
            quality: "auto",
            subtitles: subtitles.length > 0 ? subtitles : undefined,
            headers: hlsHeaders,
          });

          // Try fetching master m3u8 to extract sub-streams
          try {
            const m3u8Res = await axios.get(manifestUrl, { headers: hlsHeaders });
            const lines = m3u8Res.data.split("\n");
            const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.startsWith("#EXT-X-STREAM-INF")) {
                const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                const quality = resMatch ? `${resMatch[1]}p` : "unknown";
                const nextLine = lines[i + 1]?.trim();
                if (nextLine && !nextLine.startsWith("#")) {
                  const streamUrl = nextLine.startsWith("http") ? nextLine : baseUrl + nextLine;
                  streams.push({
                    server: `${srv.name} (${quality})`,
                    link: streamUrl,
                    type: "m3u8",
                    quality,
                    subtitles: subtitles.length > 0 ? subtitles : undefined,
                    headers: hlsHeaders,
                  });
                }
              }
            }
          } catch {
            // Master stream is already present in streams list
          }
        } else if (manifestUrl.includes(".mpd") || playerUrl.includes("type=dash")) {
          streams.push({
            server: `${srv.name} (DASH)`,
            link: manifestUrl,
            type: "dash" as any,
            quality: "auto",
            subtitles: subtitles.length > 0 ? subtitles : undefined,
            headers: hlsHeaders,
          });
        }
        continue;
      }

      // 2. Old Player fallback (JSON source list)
      const sourcesMatch = cleanHtml.match(/sources:\s*(\[[^\]]+\])/);
      if (sourcesMatch) {
        try {
          const sources = JSON.parse(sourcesMatch[1]);
          for (const s of sources) {
            if (s.file) {
              const streamUrl = fixUrl(s.file, playerUrl);
              streams.push({
                server: `${srv.name} (${s.label || "default"})`,
                link: streamUrl,
                type: streamUrl.includes(".m3u8") ? "m3u8" : "mp4",
                quality: s.label || "unknown",
              });
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // server failed, try next
    }
  }

  return streams;
};
