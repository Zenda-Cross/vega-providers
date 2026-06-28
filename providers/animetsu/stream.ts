import { Stream, ProviderContext, TextTracks } from "../types";

export const getStream = async function ({
  link: id,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, openWebView, commonHeaders } = providerContext;
    const baseUrl = "https://animetsu.net";
    const streamUrl = `https://swiftstream.top/proxy`;

    let wafCookies: string | undefined;
    try {
      await axios.get(baseUrl, {
        headers: { ...commonHeaders, Referer: baseUrl },
      });
    } catch (error: any) {
      if (error.response?.status === 403) {
        const wafResult = await openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass Animetsu anti-bot protection.",
          headers: { ...commonHeaders, Referer: baseUrl },
          force: true,
          waitForCookie: "cf_clearance",
        });
        wafCookies = wafResult.cookies;
      }
    }

    // Parse link format: "animeId:episodeNumber"
    const [animeId, episodeNumber] = id.split(":");

    if (!animeId || !episodeNumber) {
      throw new Error("Invalid link format");
    }

    const servers = ["sage", "dio"];
    const streamLinks: Stream[] = [];

    await Promise.all(
      servers.map(async (server) => {
        try {
          const url = `${baseUrl}/v2/api/anime/oppai/${animeId}/${episodeNumber}?server=${server}&source_type=sub`;

          const res = await axios.get(url, {
            headers: {
              ...commonHeaders,
              Referer: baseUrl,
              ...(wafCookies ? { Cookie: wafCookies } : {}),
            },
          });

          if (res.data && res.data.sources) {
            const subtitles: TextTracks = [];
            if (res.data.subs && Array.isArray(res.data.subs)) {
              res.data.subs.forEach((sub: any) => {
                if (sub.url && sub.lang) {
                  const langCode = sub.lang.toLowerCase().includes("english")
                    ? "en"
                    : sub.lang.toLowerCase().includes("arabic")
                      ? "ar"
                      : sub.lang.toLowerCase().includes("french")
                        ? "fr"
                        : sub.lang.toLowerCase().includes("german")
                          ? "de"
                          : sub.lang.toLowerCase().includes("italian")
                            ? "it"
                            : sub.lang.toLowerCase().includes("portuguese")
                              ? "pt"
                              : sub.lang.toLowerCase().includes("russian")
                                ? "ru"
                                : sub.lang.toLowerCase().includes("spanish")
                                  ? "es"
                                  : "und";

                  subtitles.push({
                    title: sub.lang,
                    language: langCode,
                    type: "text/vtt",
                    uri: sub.url,
                  });
                }
              });
            }
            res.data.sources.forEach((source: any) => {
              const sourceUrl = source.url.startsWith("/")
                ? `${streamUrl}${source.url}`
                : source.url;
              streamLinks.push({
                server: `${server} (Sub): ${source.quality}`,
                link: sourceUrl,
                type: "m3u8",
                quality: source.quality,
                headers: {
                  referer: baseUrl,
                },
                subtitles: subtitles.length > 0 ? subtitles : [],
              });
            });
          }
        } catch (e) {
          console.log(`Error with server ${server}:`, e);
        }
      }),
    );

    // Try dub version as well
    await Promise.all(
      servers.map(async (server) => {
        try {
          const url = `${baseUrl}/v2/api/anime/oppai/${animeId}/${episodeNumber}?server=${server}&source_type=dub`;

          const res = await axios.get(url, {
            headers: {
              ...commonHeaders,
              Referer: baseUrl,
              ...(wafCookies ? { Cookie: wafCookies } : {}),
            },
          });

          if (res.data && res.data.sources) {
            const subtitles: TextTracks = [];
            if (res.data.subs && Array.isArray(res.data.subs)) {
              res.data.subs.forEach((sub: any) => {
                if (sub.url && sub.lang) {
                  // Extract language code from lang string (e.g., "English" -> "en", "Arabic - CR" -> "ar")
                  const langCode = sub.lang.toLowerCase().includes("english")
                    ? "en"
                    : sub.lang.toLowerCase().includes("arabic")
                      ? "ar"
                      : sub.lang.toLowerCase().includes("french")
                        ? "fr"
                        : sub.lang.toLowerCase().includes("german")
                          ? "de"
                          : sub.lang.toLowerCase().includes("italian")
                            ? "it"
                            : sub.lang.toLowerCase().includes("portuguese")
                              ? "pt"
                              : sub.lang.toLowerCase().includes("russian")
                                ? "ru"
                                : sub.lang.toLowerCase().includes("spanish")
                                  ? "es"
                                  : "und";

                  subtitles.push({
                    title: sub.lang,
                    language: langCode,
                    type: "text/vtt",
                    uri: sub.url,
                  });
                }
              });
            }
            res.data.sources.forEach((source: any) => {
              const sourceUrl = source.url.startsWith("/")
                ? `${streamUrl}${source.url}`
                : source.url;
              streamLinks.push({
                server: `${server} (Dub): ${source.quality}`,
                link: sourceUrl,
                type: "m3u8",
                quality: source.quality,
                headers: {
                  referer: baseUrl,
                },
                subtitles: subtitles.length > 0 ? subtitles : [],
              });
            });
          }
        } catch (e) {
          console.log(`Error with server ${server} (dub):`, e);
        }
      }),
    );

    console.log("Stream links:", streamLinks);
    return streamLinks;
  } catch (err) {
    console.error("animetsu stream error:", err);
    return [];
  }
};
