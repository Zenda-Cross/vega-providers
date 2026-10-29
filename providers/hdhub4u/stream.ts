import { ProviderContext } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { throwProviderError } from "../providerErrors";

// ---- Helper functions ----
function rot13(str: string) {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const base = char <= "Z" ? 65 : 97;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

const safeAtob = (str: string) => {
  try { return atob(str); } catch { return null; }
};

export function decodeString(encryptedString: string) {
  if (!encryptedString) return null;
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch { return null; }
}

// ---- Helper to normalize streams from hubcloudExtractor ----
function normalizeStreams(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === "object" && result.link) return [result];
  return [];
}

// ---- Helper to deduplicate stream arrays by URL ----
function deduplicateStreams(streams: any[]) {
  const seen = new Set();
  return streams.filter((s) => {
    if (!s || !s.link) return false;
    if (seen.has(s.link)) return false;
    seen.add(s.link);
    return true;
  });
}

// ---- Resolve a single quality link ----
async function resolveLink(
  link: string,
  quality: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
  isDownload?: boolean,
): Promise<any[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  const lowerLink = link.toLowerCase();

  // 1) Direct hubcloud drive link
  if (lowerLink.includes("hubcloud") || lowerLink.includes("/drive/")) {
    try {
      const streams = await hubcloudExtractor(
        link,
        signal,
        axios,
        cheerio,
        headers,
        providerContext,
        isDownload,
        "hdhub4u",
      );
      const normalized = normalizeStreams(streams);
      return normalized.map((s: any) => ({
        ...s,
        quality: quality !== "Unknown" ? quality : (s.quality || "Unknown"),
        server: s.server || "HubCloud",
      }));
    } catch {
      return [];
    }
  }

  // 2) hubdrive link → extract embedded hubcloud
  if (lowerLink.includes("hubdrive")) {
    try {
      const res = await axios.get(link, { headers, signal });
      const text = res.data;

      const metaRefresh = text.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i);
      if (metaRefresh) {
        return resolveLink(metaRefresh[1], quality, signal, providerContext, isDownload);
      }

      const $ = cheerio.load(text);
      let hubcloudHref =
        $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") ||
        $(".btn.btn-primary.btn-user.btn-success1").attr("href");

      if (!hubcloudHref) {
        hubcloudHref = $('a[href*="hubcloud"], a[href*="/drive/"]').attr("href");
      }

      if (hubcloudHref) {
        return resolveLink(hubcloudHref, quality, signal, providerContext, isDownload);
      }
      return [];
    } catch {
      return [];
    }
  }

  // 3) Direct CDN (r2.dev or hubcdn)
  if (lowerLink.includes("r2.dev") || lowerLink.includes("hubcdn")) {
    return [{ server: "HubCDN", link, type: "mkv", quality }];
  }

  // 4) Unknown – try hubcloudExtractor anyway
  try {
    const streams = await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
      isDownload,
      "hdhub4u",
    );
    const normalized = normalizeStreams(streams);
    return normalized.map((s: any) => ({
      ...s,
      quality: quality !== "Unknown" ? quality : (s.quality || "Unknown"),
      server: s.server || "HubCloud",
    }));
  } catch {
    return [];
  }
}

// ---- Main stream extraction ----
export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}) {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  let currentLink = link;
  let pageContent = "";

  // 1) Fetch page content and handle intermediate redirects
  try {
    const res = await axios.get(currentLink, { headers, signal });
    pageContent = res.data || "";

    const reurlMatch = pageContent.match(/var\s+reurl\s*=\s*["']([^"']+)["']/i);
    if (reurlMatch) {
      currentLink = reurlMatch[1];
      const res2 = await axios.get(currentLink, { headers: { ...headers, Referer: link }, signal });
      pageContent = res2.data || "";
    }

    const encryptedString = pageContent.split("s('o','")?.[1]?.split("',180")?.[0];
    if (encryptedString) {
      const decoded = decodeString(encryptedString);
      if (decoded?.o) {
        const nextUrl = safeAtob(decoded.o);
        if (nextUrl) {
          currentLink = nextUrl;
          const res3 = await axios.get(currentLink, { headers: { ...headers, Referer: currentLink }, signal });
          pageContent = res3.data || "";
        }
      }
    }
  } catch {
    // Continue with existing pageContent
  }

  // 2) Parse quality links from the DOM
  const $ = cheerio.load(pageContent);
  const groups = new Map<string, string>();

  const getLinkScore = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes("hubcloud") || lower.includes("/drive/")) return 3;
    if (lower.includes("hubdrive")) return 2;
    if (lower.includes("hubcdn") || lower.includes("r2.dev")) return 1;
    return 0;
  };

  $('a').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const score = getLinkScore(href);
    if (score === 0) return;

    let container = $(el).closest('h1, h2, h3, h4, h5, h6, p, li, tr');
    if (!container.length) {
      container = $(el).parent();
      if (container.is('body, article, .entry-content, main, section')) {
        container = $(el);
      }
    }

    const key = container.text().trim() || $(el).text().trim() || "Unknown";

    const currentBestUrl = groups.get(key);
    if (!currentBestUrl || score > getLinkScore(currentBestUrl)) {
      groups.set(key, href);
    }
  });

  if (groups.size === 0) {
    const regexMatch = pageContent.match(/href="(https:\/\/(?:hubcloud|hubdrive)\.[^\/]+\/(?:drive|file)\/[^"]+)"/i);
    if (regexMatch) {
      const singleStream = await resolveLink(regexMatch[1], "Unknown", signal, providerContext, isDownload);
      if (singleStream.length) return deduplicateStreams(singleStream);
    }
    if (getLinkScore(currentLink) > 0) {
      const singleStream = await resolveLink(currentLink, "Unknown", signal, providerContext, isDownload);
      if (singleStream.length) return deduplicateStreams(singleStream);
    }
    throwProviderError("HDHub4u", "stream", new Error("No stream links found on page"));
    return [];
  }

  // 3) Concurrently resolve streams with parsed quality metadata
  const streamPromises: Promise<any[]>[] = [];

  for (const [textContext, targetLink] of groups.entries()) {
    let baseQuality = "";
    const lowerText = textContext.toLowerCase();

    if (/\b(2160p|4k)\b/i.test(lowerText)) baseQuality = "4K";
    else if (/\b1080p\b/i.test(lowerText)) baseQuality = "1080p";
    else if (/\b720p\b/i.test(lowerText)) baseQuality = "720p";
    else if (/\b480p\b/i.test(lowerText)) baseQuality = "480p";
    else baseQuality = "Unknown";

    const sizeMatch = textContext.match(/([0-9]+(?:\.[0-9]+)?\s*(?:MB|GB))/i);
    const size = sizeMatch ? sizeMatch[1].replace(/\s/g, '').toUpperCase() : "";

    let extra = "";
    if (/\bweb-?dl\b/i.test(lowerText)) extra = "WEB-DL";
    else if (/\bhdrip\b/i.test(lowerText)) extra = "HDRip";
    else if (/\bblu-?ray\b/i.test(lowerText)) extra = "BluRay";

    const fullQuality = [baseQuality, extra, size].filter(Boolean).join(" ");

    streamPromises.push(resolveLink(targetLink, fullQuality, signal, providerContext, isDownload));
  }

  // 4) Collect and deduplicate active stream links
  const results = await Promise.allSettled(streamPromises);
  const allStreams: any[] = [];

  results.forEach((result) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      allStreams.push(...result.value);
    }
  });

  if (allStreams.length === 0) {
    throwProviderError("HDHub4u", "stream", new Error("All quality links failed to resolve"));
    return [];
  }

  return deduplicateStreams(allStreams);
}
