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
      const f = $(sel);
      if (!f.length) return;
      const src = f.attr("data-src") || f.attr("src") || "";
      if (src) iframeUrls.push(makeAbsolute(src, url));
    };

    // ✅ Both series episodes and movies use these same iframe containers
    pick("#options-0 iframe");
    pick("#options-1 iframe");

    if (!iframeUrls.length) {
      // Fallback: return the page itself as an iframe
      return [
        {
          server: "Episode",
          link: url,
          type: "iframe",
          headers: {},
          subtitles: [],
        },
      ];
    }

    const signal = new AbortController().signal;

    // Fire BOTH in parallel — no sequential awaits
    const results = await Promise.allSettled(
      iframeUrls.map((u) =>
        u.includes("zephyrix.org") || u.includes("zephyr")
          ? zypterExtractor(u, signal, axios, cheerio, headers, providerContext)
          : abyssExtractor(u, signal, axios, cheerio, headers, providerContext)
      )
    );

    const merged: Stream[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        merged.push(...r.value);
      }
    }

    console.log(`[episode] ${merged.length} streams in ${Date.now() - t0}ms`);
    if (!merged.length) {
      return [
        {
          server: "Episode",
          link: iframeUrls[0] || url,
          type: "iframe",
          headers: {},
          subtitles: [],
        },
      ];
    }
    return merged;
  } catch (err: any) {
    console.error("[episode] error:", err?.message || err);
    return [
      {
        server: "Episode",
        link: url,
        type: "iframe",
        headers: {},
        subtitles: [],
      },
    ];
  }
};

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

  // ✅ Handle BOTH series episodes AND movie pages — they share the same player layout
  if (
    url.includes("/episode/") ||
    url.includes("/movies/") ||
    url.includes("/movie/")
  ) {
    return getEpisodeStreams({ url, providerContext });
  }

  if (url.includes("zephyrix.org") || url.includes("zephyr")) {
    return zypterExtractor(url, signal, axios, cheerio, headers, providerContext);
  }

  if (
    url.includes("dub-player") ||
    url.includes("abyssplayer") ||
    url.includes("watchanimeworld.one/dub-player")
  ) {
    return abyssExtractor(url, signal, axios, cheerio, headers, providerContext);
  }

  return zypterExtractor(url, signal, axios, cheerio, headers, providerContext);
};