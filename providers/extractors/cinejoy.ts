import { ProviderContext, Stream, TextTracks } from "../types";

let cachedCode: string | null = null;
let cachedChunkUrl: string | null = null;
let cachedServers: any[] = [
  { name: "Nebula" },
  { name: "Solara" },
  { name: "Athens" },
];
let lastServerFetchTime = Date.now();

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

async function getCinejoyChunkUrl(
  axios: any,
  headers: any,
  signal?: AbortSignal
): Promise<string> {
  if (cachedChunkUrl) return cachedChunkUrl;

  const defaultUrl = "https://cinejoy.pk/_app/immutable/chunks/DHJgaGwg.js";
  try {
    const res = await axios.get(defaultUrl, { headers, timeout: 5000, signal });
    if (
      typeof res.data === "string" &&
      res.data.includes("WebAssembly") &&
      res.data.includes('+"/g"')
    ) {
      cachedChunkUrl = defaultUrl;
      cachedCode = res.data;
      return defaultUrl;
    }
  } catch {}

  try {
    const homeRes = await axios.get("https://cinejoy.pk", {
      headers,
      timeout: 6000,
      signal,
    });
    const html = typeof homeRes.data === "string" ? homeRes.data : "";
    const appMatch = html.match(
      /_app\/immutable\/entry\/app\.[a-zA-Z0-9_-]+\.js/
    );
    if (appMatch) {
      const appRes = await axios.get(`https://cinejoy.pk/${appMatch[0]}`, {
        headers,
        timeout: 6000,
        signal,
      });
      const appText = typeof appRes.data === "string" ? appRes.data : "";
      const node25Match = appText.match(/nodes\/25\.[a-zA-Z0-9_-]+\.js/);
      if (node25Match) {
        const node25Res = await axios.get(
          `https://cinejoy.pk/_app/immutable/${node25Match[0]}`,
          { headers, timeout: 6000, signal }
        );
        const node25Text =
          typeof node25Res.data === "string" ? node25Res.data : "";
        const chunkMatches = [
          ...node25Text.matchAll(/chunks\/([a-zA-Z0-9_-]+\.js)/g),
        ].map((m: any) => m[1]);

        for (const ch of chunkMatches) {
          const chUrl = `https://cinejoy.pk/_app/immutable/chunks/${ch}`;
          const chRes = await axios.get(chUrl, { headers, timeout: 6000, signal });
          const chText = typeof chRes.data === "string" ? chRes.data : "";
          if (chText.includes("WebAssembly") && chText.includes('+"/g"')) {
            cachedChunkUrl = chUrl;
            cachedCode = chText;
            return chUrl;
          }
        }
      }
    }
  } catch {}

  cachedChunkUrl = defaultUrl;
  return defaultUrl;
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
    Origin: "https://cinejoy.pk",
    Referer: `https://cinejoy.pk/watch/${isMovie ? "movie" : "tv"}/${tmdbId}${
      isMovie ? "" : `/${season || 1}/${episode || 1}`
    }`,
    ...(commonHeaders || {}),
  };

  try {
    // 1. Fetch chunk code if not cached
    if (!cachedCode) {
      const chunkUrl = await getCinejoyChunkUrl(axios, headers, signal);
      if (!cachedCode) {
        const chunkRes = await axios.get(chunkUrl, { headers, timeout: 8000, signal });
        cachedCode = chunkRes.data;
      }
    }

    // 2. Refresh available servers in background (cache for 5 minutes)
    const now = Date.now();
    if (now - lastServerFetchTime > 300000) {
      axios
        .get("https://api.wing.st/servers", { headers, timeout: 5000, signal })
        .then((sRes: any) => {
          if (sRes.data?.servers?.length) {
            // Filter out Lisbon (lit.cheaptruckrepairs.cc returns 502 Bad Gateway on segments)
            cachedServers = sRes.data.servers.filter(
              (s: any) => s && s.name !== "Lisbon" && s.status !== "offline"
            );
            lastServerFetchTime = Date.now();
          }
        })
        .catch(() => {});
    }

    // 3. Start fetching external subtitles concurrently
    const subPromise = (async (): Promise<any[]> => {
      try {
        const subUrl = `https://subs.wing.st/subtitles?tmdb=${tmdbId}${
          isMovie ? "" : `&season=${season || 1}&episode=${episode || 1}`
        }`;
        const subRes = await axios.get(subUrl, { headers, timeout: 5000, signal });
        if (Array.isArray(subRes.data)) {
          return subRes.data
            .filter((sub: any) => sub && sub.url)
            .map((sub: any) => ({
              title: sub.display || sub.language || "Subtitle",
              language: (sub.language || "en").slice(0, 2).toLowerCase(),
              type: sub.type === "vtt" ? ("text/vtt" as const) : ("application/x-subrip" as const),
              uri: sub.url,
            }));
        }
      } catch {}
      return [];
    })();

    // 4. Setup sandbox execution (zero Node.js dependencies, 100% WebWorker compatible)
    const sandbox: any = {
      console: { log: () => {}, warn: () => {}, error: () => {} },
      caches: { open: async () => ({ match: () => null, put: () => {} }) },
      Map: Map,
      Set: Set,
      window: {
        location: {
          origin: "https://cinejoy.pk",
          href: `https://cinejoy.pk/watch/${isMovie ? "movie" : "tv"}/${tmdbId}${
            isMovie ? "" : `/${season || 1}/${episode || 1}`
          }`,
          pathname: `/watch/${isMovie ? "movie" : "tv"}/${tmdbId}${
            isMovie ? "" : `/${season || 1}/${episode || 1}`
          }`,
          host: "cinejoy.pk",
          hostname: "cinejoy.pk",
        },
        localStorage: { getItem: () => null, setItem: () => {} },
      },
      document: {
        referrer: "https://cinejoy.pk/",
        title: "Cinejoy",
        createElement: () => ({}),
        head: { appendChild: () => {} },
        body: { appendChild: () => {} },
      },
      navigator: { onLine: true },
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
            timeout: 6000,
            signal,
          });
          const rawData = fetchRes.data;
          const uint8 = new Uint8Array(rawData);
          return {
            ok: fetchRes.status >= 200 && fetchRes.status < 300,
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
      `with(sandbox) {
        const u = new Proxy({}, { get: () => () => ({}) });
        const B = () => ({});
        const nW = () => ({});
        ${cleanCode};
        return {
          resolveMovie: typeof pW !== "undefined" ? pW : (typeof k !== "undefined" ? k : null),
          resolveTv: typeof qW !== "undefined" ? qW : (typeof l !== "undefined" ? l : null),
        };
      }`
    );
    const exportsObj = runner(sandbox);

    const activeServers = (cachedServers || []).filter(
      (s: any) => s && s.name !== "Lisbon" && s.status !== "offline"
    );
    const streams: Stream[] = [];

    // 5. Query active servers in parallel with per-server timeout
    const externalSubtitles = await subPromise;

    const streamHeaders = {
      Referer: "https://cinejoy.pk/",
      Origin: "https://cinejoy.pk",
      "User-Agent": headers["User-Agent"],
    };

    const tasks = activeServers.map(async (srv) => {
      const serverName = srv.name;
      try {
        const serverQuery = (async () => {
          let resData: any = null;
          if (isMovie && exportsObj.resolveMovie) {
            resData = await exportsObj.resolveMovie(serverName, String(tmdbId));
          } else if (!isMovie && exportsObj.resolveTv) {
            resData = await exportsObj.resolveTv(
              serverName,
              String(tmdbId),
              Number(season || 1),
              Number(episode || 1)
            );
          }
          return resData;
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Server timeout")), 5000)
        );

        const resData: any = await Promise.race([serverQuery, timeoutPromise]);

        if (resData?.stream && Array.isArray(resData.stream)) {
          for (const item of resData.stream) {
            const rawSubs = [
              ...(item.captions || []).map((c: any) => ({
                title: c.id || c.language || "Subtitle",
                uri: c.url,
                type: (c.url && c.url.endsWith(".vtt") ? "text/vtt" : "application/x-subrip") as const,
                language: (c.language || c.id || "en").slice(0, 2).toLowerCase(),
              })),
              ...externalSubtitles,
            ];

            const seenSubs = new Set<string>();
            const subtitles: TextTracks = [];
            for (const s of rawSubs) {
              if (s && s.uri && !seenSubs.has(s.uri)) {
                seenSubs.add(s.uri);
                subtitles.push(s);
              }
            }

            if (item.type === "hls" && item.playlist) {
              if (
                serverName === "Lisbon" ||
                item.playlist.includes("cheaptruckrepairs")
              ) {
                continue;
              }
              streams.push({
                server: `Cinejoy - ${serverName}${srv["4k"] ? " (4K)" : ""}`,
                link: item.playlist,
                type: "m3u8",
                quality: srv["4k"] ? "2160" : "1080",
                subtitles: subtitles.length ? subtitles : undefined,
                headers: streamHeaders,
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
                    headers: streamHeaders,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Skip server if unavailable or timed out
      }
    });

    await Promise.allSettled(tasks);
    return streams;
  } catch (err) {
    console.log("extractCinejoyStreams error:", err);
    return [];
  }
}

