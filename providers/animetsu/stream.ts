import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link: id,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios } = providerContext;
    const baseUrl = "https://backend.animetsu.to";

    // Parse link format: "animeId:episodeNumber"
    const [animeId, episodeNumber] = id.split(":");

    if (!animeId || !episodeNumber) {
      throw new Error("Invalid link format");
    }

    const servers = ["pahe", "zoro"]; // Available servers based on API structure
    const streamLinks: Stream[] = [];

    await Promise.all(
      servers.map(async (server) => {
        try {
          const url = `${baseUrl}/api/anime/tiddies?server=${server}&id=${animeId}&num=${episodeNumber}&subType=sub`;

          const res = await axios.get(url, {
            headers: {
              Referer: "https://animetsu.to/",
            },
          });

          if (res.data && res.data.sources) {
            res.data.sources.forEach((source: any) => {
              streamLinks.push({
                server: server,
                link: source.url,
                type: source.url.includes(".m3u8") ? "m3u8" : "mp4",
                quality: source.quality,
                headers: {
                  Referer: "https://animetsu.to/",
                  Origin: "https://animetsu.to",
                },
                subtitles: [], // No subtitle info provided in API response
              });
            });
          }
        } catch (e) {
          console.log(`Error with server ${server}:`, e);
        }
      })
    );

    // Try dub version as well
    await Promise.all(
      servers.map(async (server) => {
        try {
          const url = `${baseUrl}/api/anime/tiddies?server=${server}&id=${animeId}&num=${episodeNumber}&subType=dub`;

          const res = await axios.get(url, {
            headers: {
              Referer: "https://animetsu.to/",
            },
          });

          if (res.data && res.data.sources) {
            res.data.sources.forEach((source: any) => {
              streamLinks.push({
                server: `${server} (Dub)`,
                link: source.url,
                type: source.url.includes(".m3u8") ? "m3u8" : "mp4",
                quality: source.quality,
                headers: {
                  Referer: "https://animetsu.to/",
                  Origin: "https://animetsu.to",
                },
                subtitles: [],
              });
            });
          }
        } catch (e) {
          console.log(`Error with server ${server} (dub):`, e);
        }
      })
    );

    return streamLinks;
  } catch (err) {
    console.error("animetsu stream error:", err);
    return [];
  }
};
