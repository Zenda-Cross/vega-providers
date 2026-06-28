import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, commonHeaders } = providerContext;
  const streams: Stream[] = [];

  try {
    const res = await axios.get(link, { headers: commonHeaders });
    const data = res.data;

    if (!data) return streams;

    // Extract soft subtitles if they exist
    let softSubtitles: any[] = [];
    if (data.hls && Array.isArray(data.hls.subtitles)) {
      softSubtitles = data.hls.subtitles.map((sub: any) => ({
        language: sub.locale || "unknown",
        url: sub.url || sub.file || sub.link || "",
      })).filter((sub: any) => sub.url);
    }

    // Process main hls (usually raw / original language)
    if (data.hls) {
      if (data.hls.playlist) {
        streams.push({
          server: `uniquestream (RAW - ${data.hls.locale || "unknown"})`,
          link: data.hls.playlist,
          type: "m3u8",
          ...(softSubtitles.length > 0 && { subtitles: softSubtitles }),
        });
      }
      if (data.hls.hard_subs && Array.isArray(data.hls.hard_subs)) {
        data.hls.hard_subs.forEach((sub: any) => {
          // Typically we prioritize english subs
          if (sub.locale === "en-US") {
            streams.push({
              server: `uniquestream (Sub - ${sub.locale})`,
              link: sub.playlist,
              type: "m3u8",
            });
          }
        });
      }
    }

    // Process other versions (usually dubs)
    if (data.versions && data.versions.hls && Array.isArray(data.versions.hls)) {
      data.versions.hls.forEach((version: any) => {
        if (version.playlist && version.locale === "en-US") {
          streams.push({
            server: `uniquestream (Dub - ${version.locale})`,
            link: version.playlist,
            type: "m3u8",
          });
        }
      });
    }

    // fallback: if we only added raw and no en-US subs/dubs, just add everything to be safe
    if (streams.length === 1 && streams[0].server.includes("RAW")) {
      if (data.hls?.hard_subs && Array.isArray(data.hls.hard_subs)) {
        data.hls.hard_subs.forEach((sub: any) => {
          if (sub.locale !== "en-US") {
            streams.push({
              server: `uniquestream (Sub - ${sub.locale})`,
              link: sub.playlist,
              type: "m3u8",
            });
          }
        });
      }
    }

    console.log('streams', streams)

    return streams;
  } catch (error) {
    console.error("uniquestream getStream failed", error);
    return [];
  }
};
