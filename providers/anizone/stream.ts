import { Stream, ProviderContext } from "../types";

// 🔹 Local subtitle type
type SubtitleTrack = {
  title: string;
  language: string;
  type: "text/vtt" | "application/x-subrip" | "application/ttml+xml";
  uri: string;
};

export const getStream = function ({
  link: url,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(url, { headers: commonHeaders })
    .then((res) => {
      const $ = cheerio.load(res.data || "");
      const streams: Stream[] = [];

      const m3u8 = $("media-player").attr("src");
      if (!m3u8) return [];

      const subtitles: SubtitleTrack[] = [];

      $("track[kind='subtitles']").each((_, el) => {
        let src = $(el).attr("src");
        if (!src) return;

        if (src.startsWith("/")) {
          src = new URL(src, url).href;
        }

        subtitles.push({
          title: $(el).attr("label") || "Subtitle",
          language: $(el).attr("srclang") || "en",
          type: "text/vtt",
          uri: src,
        });
      });

      streams.push({
        server: "AniZone",
        link: m3u8,
        type: "m3u8",
      });

      return streams;
    })
    .catch((err) => {
      console.error("AniZone stream error:", err);
      return [];
    });
};
