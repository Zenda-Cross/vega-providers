import { ProviderContext, SkipInterval, Stream, TextTracks } from "../types";
import { throwProviderError } from "../providerErrors";

const BASE_URL = "https://anikototv.to";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "*/*",
};

function rc4(key: string, input: string): string {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let a = 0;
  for (let n = 0; n < 256; n++) {
    a = (s[n] + a + key.charCodeAt(n % key.length)) % 256;
    const tmp = s[n];
    s[n] = s[a];
    s[a] = tmp;
  }
  let out = "";
  let n2 = 0;
  let a2 = 0;
  for (let r = 0; r < input.length; r++) {
    n2 = (n2 + 1) % 256;
    a2 = (s[n2] + a2) % 256;
    const tmp2 = s[n2];
    s[n2] = s[a2];
    s[a2] = tmp2;
    const k = s[(s[n2] + s[a2]) % 256];
    out += String.fromCharCode(input.charCodeAt(r) ^ k);
  }
  return out;
}

function encodeVrf(animeId: string): string {
  const encrypted = rc4("simple-hash", animeId);
  return btoa(encrypted);
}

function inferLang(label: string): string {
  const l = (label || "").toLowerCase();
  if (l.includes("english") || l.includes("eng")) return "en";
  if (l.includes("spanish") || l.includes("spa")) return "es";
  if (l.includes("french") || l.includes("fra")) return "fr";
  if (l.includes("german") || l.includes("deu")) return "de";
  if (l.includes("portuguese") || l.includes("por")) return "pt";
  if (l.includes("japanese") || l.includes("jpn")) return "ja";
  if (l.includes("chinese") || l.includes("chi") || l.includes("zho")) return "zh";
  if (l.includes("indonesian") || l.includes("ind")) return "id";
  if (l.includes("thai") || l.includes("tha")) return "th";
  if (l.includes("vietnamese") || l.includes("vie")) return "vi";
  if (l.includes("arabic") || l.includes("ara")) return "ar";
  if (l.includes("hindi") || l.includes("hin")) return "hi";
  return "und";
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio } = providerContext;
    const payload = (() => {
      try {
        return JSON.parse(link);
      } catch {
        return { slug: link, epNum: "1" };
      }
    })();

    let { slug, epNum, dataIds } = payload;
    if (!slug) return [];

    const watchUrl = `${BASE_URL}/watch/${slug}/ep-${epNum || 1}`;

    const headers = {
      ...defaultHeaders,
      Referer: `${BASE_URL}/`,
    };

    // If dataIds is missing, fetch fresh episode list
    if (!dataIds) {
      const detailRes = await axios.get(watchUrl, { headers });
      const $d = cheerio.load(detailRes.data);
      const animeId = $d(
        "#watch-page, #watch-main, .watch-wrap, [data-id]"
      )
        .first()
        .attr("data-id");

      if (animeId) {
        const vrf = encodeURIComponent(encodeVrf(animeId));
        const epRes = await axios.get(
          `${BASE_URL}/ajax/episode/list/${animeId}?vrf=${vrf}&style=default`,
          {
            headers: {
              ...headers,
              "X-Requested-With": "XMLHttpRequest",
              Referer: watchUrl,
            },
          }
        );
        if (epRes.data?.result) {
          const $ep = cheerio.load(epRes.data.result);
          const epEl = $ep(
            `ul.ep-range a[data-num="${epNum}"], .ep-range a[data-num="${epNum}"], a[data-ids]`
          ).first();
          dataIds = epEl.attr("data-ids") || "";
        }
      }
    }

    if (!dataIds) {
      return [];
    }

    const serverListUrl = `${BASE_URL}/ajax/server/list?servers=${dataIds}`;
    const srvRes = await axios.get(serverListUrl, {
      headers: {
        ...headers,
        "X-Requested-With": "XMLHttpRequest",
        Referer: watchUrl,
      },
    });

    if (!srvRes.data || srvRes.data.status !== 200 || !srvRes.data.result) {
      return [];
    }

    const $s = cheerio.load(srvRes.data.result);
    const tasks: { dataType: string; serverName: string; linkId: string }[] = [];
    const seenLinkIds = new Set<string>();

    $s("div.type, .server-type, div.types > div.type").each((_, typeEl) => {
      const dataType = $s(typeEl).attr("data-type") || "sub";
      $s(typeEl)
        .find("[data-link-id]")
        .each((_, sEl) => {
          const linkId = $s(sEl).attr("data-link-id") || "";
          const serverName = $s(sEl).text().trim() || "Server";
          if (linkId && !seenLinkIds.has(linkId)) {
            seenLinkIds.add(linkId);
            tasks.push({ dataType, serverName, linkId });
          }
        });
    });

    const streams: Stream[] = [];
    const seenIframeUrls = new Set<string>();
    const seenStreamLinks = new Set<string>();

    const addStream = (stream: Stream) => {
      if (!stream.link || seenStreamLinks.has(stream.link)) return;
      seenStreamLinks.add(stream.link);
      streams.push(stream);
    };

    await Promise.all(
      tasks.map(async (task) => {
        try {
          const getUrl = `${BASE_URL}/ajax/server?get=${encodeURIComponent(
            task.linkId
          )}`;
          const getRes = await axios.get(getUrl, {
            headers: {
              ...headers,
              "X-Requested-With": "XMLHttpRequest",
              Referer: watchUrl,
            },
            timeout: 8000,
          });

          const iframeUrl = getRes.data?.result?.url;
          if (!iframeUrl) return;

          const skipTimings =
            await providerContext.kvStore?.get<boolean>("anikoto_skipTimings");
          const skipTimingsEnabled = skipTimings ?? true;
          let skipIntervals: SkipInterval[] | undefined = undefined;

          if (skipTimingsEnabled) {
            const skipData = getRes.data?.result?.skip_data;
            if (skipData && typeof skipData === "object") {
              const intervals: SkipInterval[] = [];
              if (Array.isArray(skipData.intro) && skipData.intro.length >= 2) {
                const from = Number(skipData.intro[0]);
                const to = Number(skipData.intro[1]);
                if (!isNaN(from) && !isNaN(to) && to > from) {
                  intervals.push({ title: "Intro", from, to });
                }
              }
              if (Array.isArray(skipData.outro) && skipData.outro.length >= 2) {
                const from = Number(skipData.outro[0]);
                const to = Number(skipData.outro[1]);
                if (!isNaN(from) && !isNaN(to) && to > from) {
                  intervals.push({ title: "Outro", from, to });
                }
              }
              if (intervals.length > 0) {
                skipIntervals = intervals;
              }
            }
          }

          // Deduplicate iframe URLs (e.g. ignore duplicate CDN query parameters for same video)
          const baseIframe = iframeUrl.split("?")[0] + "#" + task.dataType;
          if (seenIframeUrls.has(baseIframe)) return;
          seenIframeUrls.add(baseIframe);

          let host = "";
          try {
            host = new URL(iframeUrl).host;
          } catch {
            host = iframeUrl.split("://")[1]?.split("/")[0] || "";
          }
          const audioLabel = task.dataType.toUpperCase();

          if (
            host.includes("vidtube") ||
            host.includes("megaplay") ||
            host.includes("vidwish")
          ) {
            const pageRes = await axios.get(iframeUrl, {
              headers: {
                ...headers,
                Referer: `https://${host}/`,
                Origin: `https://${host}`,
              },
              timeout: 8000,
            });
            const matchId = pageRes.data.match(/data-id="(\d+)"/);
            if (matchId) {
              const vidtubeDataId = matchId[1];
              const srcUrl = `https://${host}/stream/getSources?id=${vidtubeDataId}&type=${task.dataType}`;
              const srcRes = await axios.get(srcUrl, {
                headers: {
                  ...headers,
                  "X-Requested-With": "XMLHttpRequest",
                  Referer: `https://${host}/`,
                  Origin: `https://${host}`,
                },
                timeout: 8000,
              });

              const srcData = srcRes.data;
              if (srcData?.sources?.file) {
                const masterUrl = srcData.sources.file;
                const streamHeaders = {
                  Referer: `https://${host}/`,
                  Origin: `https://${host}`,
                  "User-Agent": defaultHeaders["User-Agent"],
                };

                const subtitles: TextTracks = (srcData.tracks || [])
                  .filter((t: any) => t.file && t.label)
                  .map((t: any) => ({
                    title: t.label,
                    language: inferLang(t.label),
                    type: "text/vtt" as const,
                    uri: `https://worker.zendax.me/api/fetch?url=${encodeURIComponent(
                      t.file
                    )}&headers=${encodeURIComponent(JSON.stringify(streamHeaders))}`,
                  }));

                // Add Auto Master stream
                addStream({
                  server: `${task.serverName} (${audioLabel})`,
                  link: masterUrl,
                  type: "m3u8",
                  quality: "auto",
                  subtitles: subtitles.length > 0 ? subtitles : undefined,
                  headers: streamHeaders,
                  skip: skipIntervals,
                });

                // Parse master m3u8 for resolution sub-streams
                try {
                  const m3u8Res = await axios.get(masterUrl, {
                    headers: streamHeaders,
                    timeout: 6000,
                  });
                  const lines: string[] = m3u8Res.data.split("\n");
                  const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf("/") + 1);

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith("#EXT-X-STREAM-INF")) {
                      const resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                      const quality = resMatch ? `${resMatch[1]}p` : "unknown";
                      const nextLine = lines[i + 1]?.trim();
                      if (nextLine && !nextLine.startsWith("#")) {
                        const streamUrl = nextLine.startsWith("http")
                            ? nextLine
                            : baseUrl + nextLine;
                        addStream({
                          server: `${task.serverName} (${audioLabel}) ${quality}`,
                          link: streamUrl,
                          type: "m3u8",
                          quality,
                          subtitles: subtitles.length > 0 ? subtitles : undefined,
                          headers: streamHeaders,
                          skip: skipIntervals,
                        });
                      }
                    }
                  }
                } catch {
                  // Master stream is already added
                }
              }
            }
          } else if (iframeUrl.includes("#")) {
            const fragment = iframeUrl.substring(iframeUrl.indexOf("#") + 1);
            if (fragment) {
              try {
                const decoded = atob(fragment);
                if (decoded.startsWith("http")) {
                  addStream({
                    server: `${task.serverName} (${audioLabel})`,
                    link: decoded,
                    type: "m3u8",
                    headers: {
                      Referer: "https://vibeplayer.site/",
                      Origin: "https://vibeplayer.site",
                      "User-Agent": defaultHeaders["User-Agent"],
                    },
                    skip: skipIntervals,
                  });
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore individual server errors
        }
      })
    );

    return streams;
  } catch (err) {
    throwProviderError("Anikoto", "stream", err);
  }
};
