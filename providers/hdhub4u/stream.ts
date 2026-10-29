import { ProviderContext } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { throwProviderError } from "../providerErrors";

// ---------------- helpers ----------------

function rot13(str: string) {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= "Z";
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode,
    );
  });
}

const safeAtob = (str: string) => {
  try {
    return atob(str);
  } catch {
    return null;
  }
};

export function decodeString(encryptedString: string) {
  if (!encryptedString) return null;
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function normalizeStreams(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === "object" && result.link) return [result];
  return [];
}

function dedupeByLink(streams: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const s of streams) {
    if (!s || !s.link) continue;
    if (seen.has(s.link)) continue;
    seen.add(s.link);
    out.push(s);
  }
  return out;
}

const QUALITY_ORDER: Record<string, number> = {
  "4k": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  Unknown: 0,
};

function parseQualityFromText(text: string): string {
  const t = (text || "").toLowerCase();
  if (t.includes("2160p") || t.includes("4k")) return "4k";
  if (t.includes("1080p")) return "1080p";
  if (t.includes("720p")) return "720p";
  if (t.includes("480p")) return "480p";
  return "Unknown";
}

function getLinkScore(url: string): number {
  const lower = url.toLowerCase();
  if (lower.includes("hubcloud") || lower.includes("/drive/")) return 3;
  if (lower.includes("hubdrive")) return 2;
  if (lower.includes("hubcdn") || lower.includes("r2.dev")) return 1;
  return 0;
}

// Resolve a hubdrive page → hubcloud link (handles meta-refresh + button)
async function resolveHubdriveToHubcloud(
  hubdriveUrl: string,
  signal: AbortSignal,
  axios: any,
  cheerio: any,
  headers: any,
): Promise<string | null> {
  try {
    const res = await axios.get(hubdriveUrl, { headers, signal });
    const text = res.data || "";

    const meta = text.match(
      /<META HTTP-EQUIV="refresh"\s+content="0;\s*url=([^"]+)">/i,
    );
    if (meta?.[1]) return meta[1];

    const $ = cheerio.load(text);
    const href =
      $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") ||
      $(".btn.btn-primary.btn-user.btn-success1").attr("href") ||
      $('a[href*="hubcloud"], a[href*="/drive/"]').attr("href");
    return href || null;
  } catch {
    return null;
  }
}

// Resolve ONE quality link into stream(s)
async function resolveLink(
  link: string,
  quality: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
  isDownload?: boolean,
): Promise<any[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  const lower = link.toLowerCase();

  // 1) Direct CDN link
  if (lower.includes("r2.dev") || lower.includes("hubcdn")) {
    return [{ server: "HubCDN", link, type: "mkv", quality }];
  }

  // 2) hubdrive → embedded hubcloud → extract
  if (lower.includes("hubdrive")) {
    const hc = await resolveHubdriveToHubcloud(
      link,
      signal,
      axios,
      cheerio,
      headers,
    );
    if (hc) return resolveLink(hc, quality, signal, providerContext, isDownload);
    return [];
  }

  // 3) hubcloud / drive → extractor (may return N streams)
  if (lower.includes("hubcloud") || lower.includes("/drive/")) {
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
      return normalizeStreams(streams).map((s: any) => ({
        ...s,
        quality: quality !== "Unknown" ? quality : s.quality || "Unknown",
        server: s.server || "HubCloud",
      }));
    } catch {
      return [];
    }
  }

  // 4) Unknown → still try the extractor
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
    return normalizeStreams(streams).map((s: any) => ({
      ...s,
      quality: quality !== "Unknown" ? quality : s.quality || "Unknown",
      server: s.server || "HubCloud",
    }));
  } catch {
    return [];
  }
}

// ---------------- main ----------------

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

  // ---- Fast path 1: link already IS a hubcloud/drive ----
  if (link.includes("hubcloud") || link.includes("/drive/")) {
    return await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
      isDownload,
      "hdhub4u",
    );
  }

  // ---- Fast path 2: link is a hubdrive redirect ----
  if (link.includes("hubdrive")) {
    const streams = await resolveLink(
      link,
      "Unknown",
      signal,
      providerContext,
      isDownload,
    );
    if (streams.length === 0) {
      throwProviderError(
        "HDHub4u",
        "stream",
        new Error("No streams resolved from hubdrive link"),
      );
    }
    return dedupeByLink(streams);
  }

  // ---- General path: follow redirects, then scrape quality anchors ----
  let currentLink = link;
  let text = "";

  try {
    const res = await axios.get(currentLink, { headers, signal });
    text = res.data || "";

    // a) var reurl = "..."
    const reurlMatch = text.match(/var\s+reurl\s*=\s*["']([^"']+)["']/i);
    if (reurlMatch?.[1]) {
      currentLink = reurlMatch[1];
      const res2 = await axios.get(currentLink, {
        headers: { ...headers, Referer: link },
        signal,
      });
      text = res2.data || "";
    }

    // b) obfuscated s('o', '<blob>', 180)
    const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];
    if (encryptedString) {
      const decoded = decodeString(encryptedString);
      if (decoded?.o) {
        const nextUrl = safeAtob(decoded.o);
        if (nextUrl) {
          currentLink = nextUrl;
          const res3 = await axios.get(currentLink, {
            headers: { ...headers, Referer: currentLink },
            signal,
          });
          text = res3.data || "";
        }
      }
    }
  } catch {
    // continue with whatever text we have
  }

  const $ = cheerio.load(text);

  // ---- Collect ALL quality candidates ----
  // key = quality label, value = best link for that quality
  const candidates = new Map<string, { link: string; score: number }>();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const score = getLinkScore(href);
    if (score === 0) return;

    // Determine the nearest semantic container so sibling links don't
    // inherit each other's quality text.
    let ctx = $(el).closest("h1, h2, h3, h4, h5, h6, p, li, tr");
    if (!ctx.length) {
      ctx = $(el).parent();
      if (ctx.is("body, article, .entry-content, main, section")) {
        ctx = $(el);
      }
    }
    const contextText = `${ctx.text().trim()} ${$(el).text().trim()}`;
    const quality = parseQualityFromText(contextText);

    const existing = candidates.get(quality);
    if (!existing || score > existing.score) {
      candidates.set(quality, { link: href, score });
    }
  });

  // ---- Fallback: no quality anchors found ----
  if (candidates.size === 0) {
    const directCdn = $('a[href*="r2.dev"], a[href*="hubcdn"]').attr("href");
    if (directCdn) {
      return [
        { server: "HubCDN", link: directCdn, type: "mkv", quality: "Unknown" },
      ];
    }

    const regexMatch = text.match(
      /href="(https:\/\/(?:hubcloud|hubdrive)\.[^\/]+\/(?:drive|file)\/[^"]+)"/i,
    );
    if (regexMatch?.[1]) {
      const streams = await resolveLink(
        regexMatch[1],
        "Unknown",
        signal,
        providerContext,
        isDownload,
      );
      if (streams.length) return dedupeByLink(streams);
    }

    if (getLinkScore(currentLink) > 0) {
      const streams = await resolveLink(
        currentLink,
        "Unknown",
        signal,
        providerContext,
        isDownload,
      );
      if (streams.length) return dedupeByLink(streams);
    }

    throwProviderError(
      "HDHub4u",
      "stream",
      new Error("No stream links found on page"),
    );
  }

  // ---- Resolve every quality concurrently, preserving label ----
  const ordered = Array.from(candidates.entries())
    .map(([quality, c]) => ({ quality, ...c }))
    .sort(
      (a, b) => (QUALITY_ORDER[b.quality] ?? 0) - (QUALITY_ORDER[a.quality] ?? 0),
    );

  const settled = await Promise.allSettled(
    ordered.map((c) =>
      resolveLink(c.link, c.quality, signal, providerContext, isDownload),
    ),
  );

  const allStreams: any[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      allStreams.push(...r.value);
    }
  }

  if (allStreams.length === 0) {
    throwProviderError(
      "HDHub4u",
      "stream",
      new Error("All quality links failed to resolve"),
    );
  }

  return dedupeByLink(allStreams);
}