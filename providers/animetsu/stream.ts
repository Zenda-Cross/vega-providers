import { Stream, ProviderContext, TextTracks } from "../types";

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
            const subtitles: TextTracks = [];
            // if (res.data.subtitles && Array.isArray(res.data.subtitles)) {
            //   res.data.subtitles.forEach((sub: any) => {
            //     if (sub.url && sub.lang) {
            //       // Extract language code from lang string (e.g., "English" -> "en", "Arabic - CR" -> "ar")
            //       const langCode = sub.lang.toLowerCase().includes("english")
            //         ? "en"
            //         : sub.lang.toLowerCase().includes("arabic")
            //         ? "ar"
            //         : sub.lang.toLowerCase().includes("french")
            //         ? "fr"
            //         : sub.lang.toLowerCase().includes("german")
            //         ? "de"
            //         : sub.lang.toLowerCase().includes("italian")
            //         ? "it"
            //         : sub.lang.toLowerCase().includes("portuguese")
            //         ? "pt"
            //         : sub.lang.toLowerCase().includes("russian")
            //         ? "ru"
            //         : sub.lang.toLowerCase().includes("spanish")
            //         ? "es"
            //         : "und";

            //       subtitles.push({
            //         title: sub.lang,
            //         language: langCode,
            //         type: "text/vtt",
            //         uri: sub.url,
            //       });
            //     }
            //   });
            // }
            res.data.sources.forEach((source: any) => {
              streamLinks.push({
                server: server + `: ${source.quality}`,
                link: `https://m3u8.8man.workers.dev?url=${source.url}`,
                type: "m3u8",
                quality: source.quality,
                headers: {
                  referer: "https://animetsu.to/",
                },
                subtitles: subtitles.length > 0 ? subtitles : [],
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
              referer: "https://animetsu.to/",
            },
          });

          if (res.data && res.data.sources) {
            const subtitles: TextTracks = [];
            // if (res.data.subtitles && Array.isArray(res.data.subtitles)) {
            //   res.data.subtitles.forEach((sub: any) => {
            //     if (sub.url && sub.lang) {
            //       // Extract language code from lang string (e.g., "English" -> "en", "Arabic - CR" -> "ar")
            //       const langCode = sub.lang.toLowerCase().includes("english")
            //         ? "en"
            //         : sub.lang.toLowerCase().includes("arabic")
            //         ? "ar"
            //         : sub.lang.toLowerCase().includes("french")
            //         ? "fr"
            //         : sub.lang.toLowerCase().includes("german")
            //         ? "de"
            //         : sub.lang.toLowerCase().includes("italian")
            //         ? "it"
            //         : sub.lang.toLowerCase().includes("portuguese")
            //         ? "pt"
            //         : sub.lang.toLowerCase().includes("russian")
            //         ? "ru"
            //         : sub.lang.toLowerCase().includes("spanish")
            //         ? "es"
            //         : "und";

            //       subtitles.push({
            //         title: sub.lang,
            //         language: langCode,
            //         type: "text/vtt",
            //         uri: sub.url,
            //       });
            //     }
            //   });
            // }
            res.data.sources.forEach((source: any) => {
              streamLinks.push({
                server: `${server} (Dub) : ${source.quality}`,
                link: `https://m3u8.8man.workers.dev?url=${source.url}`,
                type: "m3u8",
                quality: source.quality,
                headers: {
                  referer: "https://animetsu.to/",
                },
                subtitles: subtitles.length > 0 ? subtitles : [],
              });
            });
          }
        } catch (e) {
          console.log(`Error with server ${server} (dub):`, e);
        }
      })
    );

    console.log("Stream links:", streamLinks);
    return streamLinks;
  } catch (err) {
    console.error("animetsu stream error:", err);
    return [];
  }
};
