import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";

const FALLBACK_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                          */
/* ------------------------------------------------------------------ */

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

/**
 * Check if a URL is still a zipper / intermediate page.
 * ★ Must NOT match hubcloud URLs — only codedew zipper steps.
 */
function isZipperUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.includes("codedew.com") ||
      url.includes("/zipper") ||
      url.includes("ad_done")
    );
  } catch {
    return url.includes("zipper") || url.includes("ad_done");
  }
}

/**
 * Extract the next URL from an intermediate HTML page.
 */
function extractNextUrl(
  $: any,
  html: string,
  baseUrl: string
): string | null {
  // 1) data-href (cheerio decodes &amp; → & automatically)
  const dataHref = $("[data-href]").first().attr("data-href");
  if (dataHref && dataHref.trim()) {
    const clean = dataHref.trim();
    return clean.startsWith("http")
      ? clean
      : new URL(clean, baseUrl).href;
  }

  // 2) meta-refresh
  const metaMatch = html.match(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*?url=([^"'&]+)/i
  );
  if (metaMatch?.[1]) {
    return metaMatch[1].startsWith("http")
      ? metaMatch[1]
      : new URL(metaMatch[1], baseUrl).href;
  }

  // 3) Anchor pointing at hubcloud / gamerxyt / drive
  const anchorMatch = html.match(
    /<a[^>]+href=["']([^"']*(?:hubcloud|gamerxyt|drive)[^"']*)["']/i
  );
  if (anchorMatch?.[1]) {
    return anchorMatch[1].startsWith("http")
      ? anchorMatch[1]
      : new URL(anchorMatch[1], baseUrl).href;
  }

  // 4) JS redirect
  const jsMatch = html.match(
    /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i
  );
  if (jsMatch?.[1]) {
    return jsMatch[1].startsWith("http")
      ? jsMatch[1]
      : new URL(jsMatch[1], baseUrl).href;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  getStream                                                         */
/* ------------------------------------------------------------------ */
export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  const mergedHeaders = { ...commonHeaders, ...FALLBACK_HEADERS };

  const streamLinks: Stream[] = [];
  let currentLink = link;

  try {
    console.log("[RareAnimes] getStream start:", link);

    /* ============================================================== */
    /*  Follow the zipper chain until we reach the HubCloud URL       */
    /* ============================================================== */
    const MAX_HOPS = 6;
    let hubcloudUrl: string | null = null;

    for (let hop = 1; hop <= MAX_HOPS; hop++) {
      if (signal?.aborted) {
        console.log("[RareAnimes] Aborted during hop", hop);
        return [];
      }

      // ★ If the current link is already NOT a zipper URL, it's our final link
      if (!isZipperUrl(currentLink)) {
        console.log(
          `[RareAnimes] Hop ${hop}: current link is already final (non-zipper).`
        );
        hubcloudUrl = currentLink;
        break;
      }

      console.log(`[RareAnimes] Hop ${hop}: fetching…`);
      console.log(`[RareAnimes]   URL: ${currentLink}`);

      const res = await axios.get(currentLink, {
        headers: mergedHeaders,
        signal,
        timeout: 30_000,
      });

      const html: string = res.data || "";
      const $ = cheerio.load(html);

      // ── Try to extract the next URL ──────────────────────────────
      const nextUrl = extractNextUrl($, html, currentLink);

      if (!nextUrl) {
        console.warn(
          `[RareAnimes] Hop ${hop}: no next URL found. Stopping.`
        );
        break;
      }

      console.log(`[RareAnimes] Hop ${hop} → next: ${nextUrl}`);

      // ★ If the next URL is a HubCloud URL, we're done — no need to
      //   fetch it again here (the extractor will).
      if (!isZipperUrl(nextUrl)) {
        console.log(
          `[RareAnimes] Hop ${hop} → FINAL HubCloud URL reached: ${nextUrl}`
        );
        hubcloudUrl = nextUrl;
        break;
      }

      // ★ Still a zipper page — wait for its 5-second timer, then continue
      console.log(
        `[RareAnimes] Hop ${hop}: still a zipper URL, waiting 5.5s before next hop…`
      );
      await sleep(5_500, signal);

      currentLink = nextUrl;
    }

    /* ============================================================== */
    /*  Final step: HubCloud extraction                                */
    /* ============================================================== */
    // ★ Use the resolved hubcloud URL if we found one; otherwise fall
    //   back to the current link (which may itself be a hubcloud URL).
    const finalLink = hubcloudUrl || currentLink;

    console.log("[RareAnimes] Final link for hubcloudExtractor:", finalLink);

    if (!finalLink || isZipperUrl(finalLink)) {
      console.warn(
        "[RareAnimes] ⚠️ Could not resolve a HubCloud URL from the zipper chain."
      );
      return [];
    }

    const hubcloudStreams = await hubcloudExtractor(
      finalLink,
      signal,
      axios,
      cheerio,
      mergedHeaders,
      providerContext,
      isDownload,
      "rareanimes",
    );

    if (hubcloudStreams?.length) {
      streamLinks.push(...hubcloudStreams);
      console.log(
        `[RareAnimes] ✅ hubcloudExtractor returned ${hubcloudStreams.length} stream(s).`
      );
    } else {
      console.warn("[RareAnimes] ⚠️ hubcloudExtractor returned no streams.");
    }

    return streamLinks;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.log("[RareAnimes] getStream aborted.");
      return [];
    }

    console.error("[RareAnimes] getStream error:", err?.message || err);
    return [];
  }
}