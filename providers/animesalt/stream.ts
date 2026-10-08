// getStream.ts
import { Stream, ProviderContext } from "../types";
import { abyssExtractor } from "../extractors/abbasy";
import { zypterExtractor } from "../extractors/zypter";

function makeAbsolute(url: string, base: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const b = new URL(base);
  if (url.startsWith("/")) return `${b.protocol}//${b.host}${url}`;
  return `${b.protocol}//${b.host}/${url}`;
}

// ---- Base64 decoder that works in RN and Node ----
function decodeBase64(input: string): string {
  try {
    // React Native / browser
    if (typeof atob === "function") {
      const binary = atob(input);
      // convert binary string → UTF-8
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
  } catch {
    /* ignore */
  }
  try {
    // Node fallback
    // @ts-ignore
    return Buffer.from(input, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

// Domains that serve the Zypter-style `/video/<hash>` player
const ZYPTER_HOSTS = ["zephyrix.org", "zephyr", "ravok.buzz", "ravok"];

// Domains / paths that serve the Abyss/Plyr player
const ABYSS_MARKERS = [
  "abyssplayer",
  "abysssplayer",
  "dub-player",
  "/plyr/player.php", // animesalt wrapper page
];

const isZypterUrl = (u: string) => ZYPTER_HOSTS.some((h) => u.includes(h));
const isAbyssUrl = (u: string) => ABYSS_MARKERS.some((m) => u.includes(m));
const isPlyrWrapper = (u: string) => u.includes("player.php?data=");

// =====================================================================
// 🎧 plyrWrapperExtractor
// Fetches an animesalt `player.php?data=...` wrapper page and extracts
// every language link (Hindi / English / Japanese) then runs
// abyssExtractor on each of them in parallel.
// =====================================================================
async function plyrWrapperExtractor(
  playerUrl: string,
  signal: AbortSignal,
  axios: any,
  cheerio: any,
  headers: any,
  providerContext: ProviderContext
): Promise<Stream[]> {
  const options: { language: string; link: string }[] = [];

  // -------- 1. Try decoding the ?data= param directly --------
  try {
    const u = new URL(playerUrl);
    const data = u.searchParams.get("data");
    if (data) {
      const decoded = decodeBase64(data);
      if (decoded) {
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.link) {
              options.push({
                language: String(item.language || "").trim(),
                link: String(item.link).trim(),
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.log("plyrWrapperExtractor: data decode failed", e);
  }

  // -------- 2. Fallback: scrape the wrapper HTML --------
  if (options.length === 0) {
    try {
      const res = await axios.get(playerUrl, { headers, signal, timeout: 8000 });
      const $ = cheerio.load(res.data || "");

      $(".modal-option").each((_: any, el: any) => {
        const link = $(el).attr("data-link")?.trim();
        const language = $(el).attr("data-language")?.trim() || "";
        if (link) options.push({ language, link });
      });
    } catch (e) {
      console.log("plyrWrapperExtractor: HTML fetch failed", e);
    }
  }

  if (options.length === 0) {
    console.log("plyrWrapperExtractor: no audio options found");
    return [];
  }

  console.log(
    `plyrWrapperExtractor: found ${options.length} audio options →`,
    options.map((o) => o.language || o.link)
  );

  // -------- 3. Run abyssExtractor on each language link in parallel --------
  const results = await Promise.allSettled(
    options.map((opt) =>
      abyssExtractor(
        opt.link,
        signal,
        axios,
        cheerio,
        headers,
        providerContext
      ).then((streams) =>
        streams.map((s) => ({
          ...s,
          // Prefix the server name with the language so the user
          // can tell the tracks apart in the picker
          server: opt.language ? `${opt.language} • ${s.server}` : s.server,
        }))
      )
    )
  );

  const merged: Stream[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      merged.push(...r.value);
    }
  }

  // Deduplicate by link
  const seen = new Set<string>();
  const unique = merged.filter((s) => {
    if (!s.link || seen.has(s.link)) return false;
    seen.add(s.link);
    return true;
  });

  console.log(`plyrWrapperExtractor: ${unique.length} total streams`);
  return unique;
}

// =====================================================================
// 📄 getEpisodeStreams  (used for /episode/ and /movies/ pages)
// =====================================================================
const getEpisodeStreams = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  const t0 = Date.now();

  try {
    const res = await axios.get(url, { headers, timeout: 8000 });
    const $ = cheerio.load(res.data);

    const iframeUrls: string[] = [];
    const pick = (sel: string) => {
      $(sel).each((_: any, el: any) => {
        const src = $(el).attr("data-src") || $(el).attr("src") || "";
        if (src) {
          const abs = makeAbsolute(src, url);
          if (!iframeUrls.includes(abs)) {
            iframeUrls.push(abs);
          }
        }
      });
    };

    // Primary selectors for AnimeSalt
    pick(".video-box iframe");
    pick("#responsiveIframe");
    pick("section.video iframe");
    pick(".video-content iframe");

    // Toro/WordPress theme legacy selectors
    pick("#options-0 iframe");
    pick("#options-1 iframe");
    pick(".video-player iframe");
    pick("#aa-options iframe");
    pick("aside.video-player iframe");

    // Generic fallback for any iframe (ignoring ad networks)
    if (iframeUrls.length === 0) {
      $("iframe").each((_: any, el: any) => {
        const src = $(el).attr("data-src") || $(el).attr("src") || "";
        if (
          src &&
          !/google|doubleclick|highrevenueformat|adservice|disqus|llvpn/i.test(src)
        ) {
          const abs = makeAbsolute(src, url);
          if (!iframeUrls.includes(abs)) iframeUrls.push(abs);
        }
      });
    }

    if (!iframeUrls.length) {
      return [];
    }

    const signal = new AbortController().signal;

    // Fire everything in parallel
    const results = await Promise.allSettled(
      iframeUrls.map((u) => {
        if (isPlyrWrapper(u)) {
          return plyrWrapperExtractor(
            u,
            signal,
            axios,
            cheerio,
            headers,
            providerContext
          );
        }
        if (isZypterUrl(u)) {
          return zypterExtractor(
            u,
            signal,
            axios,
            cheerio,
            headers,
            providerContext
          );
        }
        return abyssExtractor(
          u,
          signal,
          axios,
          cheerio,
          headers,
          providerContext
        );
      })
    );

    const merged: Stream[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        merged.push(...r.value);
      }
    }

    console.log(`[episode] ${merged.length} streams in ${Date.now() - t0}ms`);
    if (!merged.length) {
      if (
        iframeUrls.length > 0 &&
        !iframeUrls[0].includes("/episode/") &&
        !iframeUrls[0].includes("/movies/")
      ) {
        return [
          {
            server: "AnimeSalt (Embed)",
            link: iframeUrls[0],
            type: "iframe",
            headers: {},
            subtitles: [],
          },
        ];
      }
      return [];
    }

    const mapped = merged.map((s) => ({
      ...s,
      server: s.server === "ZephyrFlick" ? "HLS (Multi-Audio)" : s.server,
    }));
    return mapped;
  } catch (err: any) {
    console.error("[episode] error:", err?.message || err);
    return [];
  }
};

// =====================================================================
// 🚀 getStream
// =====================================================================
export const getStream = async function ({
  link: url,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  console.log("[getStream]", url);
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  const signal = new AbortController().signal;

  // 1. Series episodes AND movie pages → scrape iframes
  if (
    url.includes("/episode/") ||
    url.includes("/movies/") ||
    url.includes("/movie/")
  ) {
    return getEpisodeStreams({ url, providerContext });
  }

  // 2. Animesalt wrapper page  →  decode ?data= and extract from every audio link
  if (isPlyrWrapper(url)) {
    return plyrWrapperExtractor(
      url,
      signal,
      axios,
      cheerio,
      headers,
      providerContext
    );
  }

  // 3. Direct Zypter-style player
  if (isZypterUrl(url)) {
    return zypterExtractor(url, signal, axios, cheerio, headers, providerContext);
  }

  // 4. Direct Abyss/Plyr player
  if (isAbyssUrl(url)) {
    return abyssExtractor(url, signal, axios, cheerio, headers, providerContext);
  }

  // 5. Default — Zypter first
  return zypterExtractor(url, signal, axios, cheerio, headers, providerContext);
};