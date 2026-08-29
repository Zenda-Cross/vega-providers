import { ProviderContext, Stream, TextTracks } from "../types";

let cachedCode: string | null = null;
let cachedServers: any[] | null = null;
let lastServerFetchTime = 0;

function safeBtoa(str: string): string {
  if (typeof btoa !== "undefined") return btoa(str);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  for (
    let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("Invalid character in btoa");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

function safeAtob(input: string): string {
  if (typeof atob !== "undefined") return atob(input);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = String(input).replace(/=+$/, "");
  let output = "";
  if (str.length % 4 === 1) {
    throw new Error("Invalid atob length");
  }
  for (
    let bc = 0, bs = 0, buffer, i = 0;
    (buffer = str.charAt(i++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

export async function extractCinejoyStreams({
  tmdbId,
  season,
  episode,
  type,
  providerContext,
  signal,
}: {
  tmdbId: string;
  season?: number | string;
  episode?: number | string;
  type: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<Stream[]> {
  const { axios, commonHeaders } = providerContext;
  const isMovie = type === "movie";

  if (!tmdbId) return [];

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Origin: "https://cinejoy.to",
    Referer: `https://cinejoy.to/watch/${isMovie ? "movie" : "tv"}/${tmdbId}${
      isMovie ? "" : `/${season || 1}/${episode || 1}`
    }`,
    ...(commonHeaders || {}),
  };

  try {
    // 1. Fetch chunk code if not cached
    if (!cachedCode) {
      const chunkRes = await axios.get(
        "https://cinejoy.to/_app/immutable/chunks/DsIc7hoQ.js",
        { headers, timeout: 8000, signal }
      );
      cachedCode = chunkRes.data;
    }

    // 2. Fetch available servers (cache for 5 minutes)
    const now = Date.now();
    if (!cachedServers || now - lastServerFetchTime > 300000) {
      try {
        const sRes = await axios.get("https://api.shegu.st/servers", {
          headers,
          timeout: 6000,
          signal,
        });
        cachedServers = sRes.data?.servers || [];
        lastServerFetchTime = now;
      } catch {
        if (!cachedServers?.length) {
          cachedServers = [
            { name: "Lisbon", "4k": true },
            { name: "Nebula" },
            { name: "Solara" },
            { name: "Athens" },
            { name: "Joy" },
            { name: "Castle" },
            { name: "Canaias" },
          ];
        }
      }
    }

    // 3. Setup sandbox execution (zero Node.js dependencies, 100% WebWorker compatible)
    const sandbox: any = {
      console: { log: () => {}, warn: () => {}, error: () => {} },
      caches: undefined,
      Map: Map,
      Set: Set,
      window: {
        location: {
          origin: "https://cinejoy.to",
          href: `https://cinejoy.to/watch/${isMovie ? "movie" : "tv"}/${tmdbId}${
            isMovie ? "" : `/${season || 1}/${episode || 1}`
          }`,
          pathname: `/watch/${isMovie ? "movie" : "tv"}/${tmdbId}${
            isMovie ? "" : `/${season || 1}/${episode || 1}`
          }`,
          host: "cinejoy.to",
          hostname: "cinejoy.to",
        },
      },
      document: {
        referrer: "https://cinejoy.to/",
        title: "Cinejoy",
      },
      URLSearchParams:
        typeof URLSearchParams !== "undefined" ? URLSearchParams : undefined,
      TextEncoder: typeof TextEncoder !== "undefined" ? TextEncoder : undefined,
      TextDecoder: typeof TextDecoder !== "undefined" ? TextDecoder : undefined,
      crypto: typeof crypto !== "undefined" ? crypto : undefined,
      btoa: safeBtoa,
      atob: safeAtob,
      WebAssembly:
        typeof WebAssembly !== "undefined" ? WebAssembly : undefined,
      fetch: async (u: string, opts: any) => {
        try {
          const fetchRes = await axios({
            url: u,
            method: opts?.method || "GET",
            headers: {
              ...headers,
              ...(opts?.headers || {}),
            },
            data: opts?.body,
            responseType: "arraybuffer",
            timeout: 8000,
            signal,
          });
          const rawData = fetchRes.data;
          const uint8 = new Uint8Array(rawData);
          return {
            ok: true,
            status: fetchRes.status,
            text: async () => {
              try {
                return new TextDecoder().decode(uint8);
              } catch {
                return String.fromCharCode.apply(null, Array.from(uint8));
              }
            },
            json: async () => {
              const str = new TextDecoder().decode(uint8);
              return JSON.parse(str);
            },
            arrayBuffer: async () => uint8.buffer,
            headers: new Map(Object.entries(fetchRes.headers || {})),
          };
        } catch (e: any) {
          const data = e.response?.data
            ? new Uint8Array(e.response.data)
            : new Uint8Array(0);
          return {
            ok: false,
            status: e.response?.status || 500,
            text: async () => new TextDecoder().decode(data),
            json: async () =>
              data.length ? JSON.parse(new TextDecoder().decode(data)) : {},
            arrayBuffer: async () => data.buffer,
            headers: new Map(),
          };
        }
      },
    };

    const cleanCode = (cachedCode || "")
      .replace(/import[^;]+;/g, "")
      .replace(/export\s*\{[^}]+\};?/g, "");

    // Run using Function constructor
    const runner = new Function(
      "sandbox",
      `with(sandbox) { ${cleanCode}; return { f0: typeof f0 !== "undefined" ? f0 : null, k0: typeof k0 !== "undefined" ? k0 : null }; }`
    );
    const exportsObj = runner(sandbox);

    const activeServers = cachedServers || [];
    const streams: Stream[] = [];

    // 4. Query active servers in parallel
    const tasks = activeServers.map(async (srv) => {
      const serverName = srv.name;
      try {
        let resData: any = null;
        if (isMovie && exportsObj.f0) {
          resData = await exportsObj.f0(serverName, String(tmdbId));
        } else if (!isMovie && exportsObj.k0) {
          resData = await exportsObj.k0(
            serverName,
            String(tmdbId),
            Number(season || 1),
            Number(episode || 1)
          );
        }

        if (resData?.stream && Array.isArray(resData.stream)) {
          for (const item of resData.stream) {
            const subtitles: TextTracks[] = (item.captions || []).map(
              (c: any) => ({
                title: c.id || c.language || "Subtitle",
                file: c.url,
                language: c.language || c.id,
              })
            );

            if (item.type === "hls" && item.playlist) {
              streams.push({
                server: `Cinejoy - ${serverName}${srv["4k"] ? " (4K)" : ""}`,
                link: item.playlist,
                type: "m3u8",
                quality: srv["4k"] ? "2160" : "1080",
                subtitles: subtitles.length ? subtitles : undefined,
                headers: {
                  Referer: "https://cinejoy.to/",
                  Origin: "https://cinejoy.to",
                },
              });
            } else if (item.type === "file" && item.qualities) {
              for (const [qKey, qVal] of Object.entries<any>(item.qualities)) {
                if (qVal?.url) {
                  streams.push({
                    server: `Cinejoy - ${serverName} (${item.id || qKey})`,
                    link: qVal.url,
                    type: qVal.type || "mp4",
                    quality: qKey.includes("1080")
                      ? "1080"
                      : qKey.includes("720")
                      ? "720"
                      : undefined,
                    subtitles: subtitles.length ? subtitles : undefined,
                    headers: {
                      Referer: "https://cinejoy.to/",
                      Origin: "https://cinejoy.to",
                    },
                  });
                }
              }
            }
          }
        }
      } catch {
        // Skip server if unavailable for this media
      }
    });

    await Promise.allSettled(tasks);

    // 5. Fetch downloads.shegu.st direct links and append at the end
    try {
      const dlUrl = `https://downloads.shegu.st/${isMovie ? "movie" : "tv"}/${tmdbId}${
        isMovie ? "" : `/${season || 1}/${episode || 1}`
      }`;
      const dlRes = await axios.get(dlUrl, {
        headers,
        timeout: 8000,
        signal,
      });
      const dlLinks = dlRes.data?.links || [];
      for (const dl of dlLinks) {
        if (!dl?.url) continue;
        const srvName = dl.source || "Download";
        const sizeTag = dl.size ? ` [${dl.size}]` : "";
        streams.push({
          server: `Cinejoy - ${srvName}${sizeTag}`,
          link: dl.url,
          type: dl.url.includes(".m3u8") ? "m3u8" : "mkv",
          quality: dl.quality ? String(dl.quality) : undefined,
          headers: {
            Referer: "https://cinejoy.to/",
            Origin: "https://cinejoy.to",
          },
        });
      }
    } catch {
      // Ignore if downloads endpoint has no entries for this title
    }

    return streams;
  } catch (err) {
    console.log("extractCinejoyStreams error:", err);
    return [];
  }
}
