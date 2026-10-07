// extractors/zypter.ts
import { Stream } from "../types";

type ZephyrFlickApiResponse = {
  videoSource?: string;
  securedLink?: string;
  [key: string]: any;
};

/* ================================================================== */
/*  ZEPHYRFLICK EXTRACTOR                                              */
/* ================================================================== */
export async function zypterExtractor(
  link: string,
  signal: AbortSignal,
  axios: any,
  cheerio: any,
  headers: Record<string, string>,
  providerContext?: any
): Promise<Stream[]> {
  const streamLinks: Stream[] = [];

  try {
    // ── 1. Extract data ID ────────────────────────────────────────
    const dataMatch =
      link.match(/\/video\/([a-zA-Z0-9_-]+)/) ||
      link.match(/\/([a-zA-Z0-9_-]+)\/?$/);
    const dataId = dataMatch
      ? dataMatch[1]
      : link.split("/").filter(Boolean).pop();

    if (!dataId) {
      console.warn("[zypter] no data ID in URL");
      return [];
    }

    const urlObj = new URL(link);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const apiUrl = `${baseUrl}/player/index.php?data=${dataId}&do=getVideo`;

    // ── 2. Request headers ────────────────────────────────────────
    const apiHeaders: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: baseUrl,
      Referer: link,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    };

    // ── 3. POST to getVideo endpoint ──────────────────────────────
    // Pass URLSearchParams directly — axios handles it natively.
    // Do NOT pass `signal` — CloudStream's axios wrapper doesn't
    // support AbortSignal and will throw a TS/runtime error.
    const body = new URLSearchParams({ hash: dataId, r: baseUrl });

    const apiRes = await axios.post(apiUrl, body, {
      headers: apiHeaders,
      timeout: 10000,
    });

    const streamUrl: string | undefined =
      apiRes?.data?.securedLink || apiRes?.data?.videoSource;

    if (!streamUrl) {
      console.warn("[zypter] no stream in response");
      return [];
    }

    // ── 4. Build final stream ─────────────────────────────────────
    streamLinks.push({
      server: "ZephyrFlick",
      link: streamUrl,
      type: streamUrl.includes(".m3u8") ? "m3u8" : "mp4",
      headers: {
        Referer: baseUrl,
        Origin: baseUrl,
        "User-Agent": apiHeaders["User-Agent"],
      },
      subtitles: [],
    });

    console.log(`[zypter] queued ${streamUrl.slice(0, 80)}…`);
    return streamLinks;
  } catch (err: any) {
    console.error("[zypter] error:", err?.message || err);
    return [];
  }
}

export const getZephyrFlickStream = zypterExtractor;