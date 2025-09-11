// stream.ts
import { ProviderContext } from "../types";

const DEFAULT_HEADERS = {
  Referer: "https://strmup.to/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const URL_REGEX = /https?:\/\/[^\s'"]{10,500}/g;

// preferred video host / extension list
const PREFERRED_PATTERNS = [
  /\.m3u8(\?|$)/i,
  /\.mp4(\?|$)/i,
  /drive\.google\.com/i,
  /gofile\.io/i,
  /mega\.nz/i,
  /mediafire\.com/i,
  /dood\.watch|doodstream/i,
  /filemoon\.ws|filemoon\.to/i,
  /streamlare\.com/i,
];

function pickBest(urls: string[]): string | null {
  if (!urls || urls.length === 0) return null;
  for (const p of PREFERRED_PATTERNS) {
    const found = urls.find(u => p.test(u));
    if (found) return found;
  }
  return urls.find(u => /\.(mp4|mkv|avi)(\?|$)/i.test(u)) || urls[0] || null;
}

async function extractUrlsFromText(text: string): Promise<string[]> {
  const found: Set<string> = new Set();
  const matches = text.match(URL_REGEX) || [];
  matches.forEach(raw => {
    let u = raw.replace(/[)"'\]}]+$/, "");
    u = u.replace(/^[('"[]+/, "");
    if (u.length > 10 && u.length < 2000) found.add(u);
  });
  return Array.from(found);
}

async function fetchAndExtract(axios: any, url: string, signal?: AbortSignal) {
  try {
    const res = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      maxRedirects: 5,
      timeout: 15000,
      signal,
      responseType: "text",
      validateStatus: (s: number) => s >= 200 && s < 400,
    });
    const body = String(res.data || "");
    const urls = await extractUrlsFromText(body);
    return { urls, finalUrl: res.request?.res?.responseUrl || res.request?.responseURL || url, body };
  } catch (err) {
    return { urls: [], finalUrl: url, body: "" };
  }
}

export async function getStream({
  link,
  signal,
  providerContext,
  streamType,
}: {
  link: string;
  streamType: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios } = providerContext;

  try {
    if (!link) return [];

    // direct m3u8 / mp4
    if (/\.(m3u8)(\?|$)/i.test(link)) {
      console.log("✅ Direct HLS found:", link);
      return [{ url: link, type: "hls", quality: "auto" }];
    }
    if (/\.(mp4|mkv|avi)(\?|$)/i.test(link)) {
      console.log("✅ Direct MP4 found:", link);
      return [{ url: link, type: "direct", quality: "auto" }];
    }

    const first = await fetchAndExtract(axios, link, signal);
    let candidates = first.urls || [];

    // check if page has iframes pointing to other hosts
    if (candidates.length === 0) {
      const iframeSrcs = Array.from(String(first.body || "").matchAll(/<iframe[^>]+src\s*=\s*['"]([^'"]+)['"]/gi)).map(m => m[1]);
      for (const s of iframeSrcs) {
        const resolved = s.startsWith("http") ? s : new URL(s, first.finalUrl).href;
        const second = await fetchAndExtract(axios, resolved, signal);
        candidates = candidates.concat(second.urls || []);
        if (candidates.length) break;
      }
    }

    candidates = Array.from(new Set(candidates));
    let best = pickBest(candidates);

    if (!best && first.finalUrl && first.finalUrl !== link) {
      const f2 = await fetchAndExtract(axios, first.finalUrl, signal);
      candidates = candidates.concat(f2.urls || []);
      candidates = Array.from(new Set(candidates));
      best = pickBest(candidates);
    }

    if (best && !/\.(m3u8|mp4|mkv|avi|zip)(\?|$)/i.test(best) && !/drive\.google\.com|mega\.nz|mediafire\.com|gofile\.io/i.test(best)) {
      const deeper = await fetchAndExtract(axios, best, signal);
      const more = Array.from(new Set(candidates.concat(deeper.urls || [])));
      const pick = pickBest(more);
      if (pick) best = pick;
    }

    if (!best && candidates.length > 0) best = candidates[0];

    if (!best) return [];

    console.log("✅ Stream URL fetched:", best);

    if (best.includes(".m3u8")) {
      try {
        await axios.head(best, { headers: { ...DEFAULT_HEADERS, Referer: link }, timeout: 10000, maxRedirects: 5 });
      } catch {}
      return [{ url: best, type: "hls", quality: "auto" }];
    }

    if (/\.(mp4|mkv|avi)(\?|$)/i.test(best)) return [{ url: best, type: "direct", quality: "auto" }];

    return [{ url: best, type: "host", quality: "auto" }];
  } catch (err: any) {
    console.error("StrmUp getStream error:", err?.message || err);
    return [];
  }
}
