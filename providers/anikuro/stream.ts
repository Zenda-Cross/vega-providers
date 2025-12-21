import { Stream, ProviderContext } from "../types";

const API_BASE = "https://9aniwatch.tailcf24b9.ts.net/url";

const SERVERS = ["alpha", "bravo", "delta"] as const;
const TYPES = ["sub", "dub"] as const;

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const streams: Stream[] = [];

  try {
    // --------------------------------------------------
    // 🔑 Extract episodeId
    // --------------------------------------------------
    const epMatch = link.match(/[?&]ep=(\d+)/);
    const episodeId = epMatch?.[1];
    if (!episodeId) return [];

    // --------------------------------------------------
    // 🔁 SUB / DUB + SERVERS
    // --------------------------------------------------
    for (const type of TYPES) {
      for (const server of SERVERS) {
        try {
          const apiUrl = `${API_BASE}?server=${server}&type=${type}&episodeId=${episodeId}`;
          const res = await axios.get(apiUrl);
          const data = res?.data;
          if (!data) continue;

          // ---------------- STREAM URL ----------------
          let streamUrl = "";

          if (Array.isArray(data.sources)) {
            streamUrl = data.sources[0]?.file;
          } else if (data.sources?.file) {
            streamUrl = data.sources.file;
          }

          if (!streamUrl) continue;

          // ---------------- SUBTITLES (STRICT TYPE) ----------------
          const subtitles: {
            title: string;
            language: string;
            type: "text/vtt";
            uri: string;
          }[] = [];

          if (type === "sub" && Array.isArray(data.tracks)) {
            for (const track of data.tracks) {
              if (track.file) {
                subtitles.push({
                  title: track.label || "English",
                  language: "en",
                  type: "text/vtt",
                  uri: track.file,
                });
              }
            }
          }

          streams.push({
            server: `${server.toUpperCase()}-${type.toUpperCase()}`,
            link: streamUrl,
            type: "m3u8",
          });
        } catch {
          // skip broken server
        }
      }
    }

    return streams;
  } catch (err: any) {
    console.log("stream api error:", err?.message || err);
    return [];
  }
};
