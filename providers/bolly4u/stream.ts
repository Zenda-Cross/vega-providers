import { ProviderContext } from "../types";

export interface Stream {
  server: string;
  url: string;
  type: string;
  quality: "360" | "480" | "720" | "1080" | "2160" | "auto";
  headers?: Record<string, string>;
}

const headers = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

/**
 * Resolves intermediary download / streaming links to final playable URL.
 */
async function resolveUrl(url: string, providerContext: ProviderContext): Promise<string | null> {
  try {
    const { axios } = providerContext;
    const res = await axios.get(url, { headers });

    // Check for JavaScript redirect
    const jsMatch = res.data.match(/window\.location\.href\s*=\s*['"](.*?)['"]/);
    if (jsMatch?.[1]) return jsMatch[1];

    // Check for direct link in <a> tags
    const linkMatch = res.data.match(/<a[^>]+href=['"]([^'"]+\.(mp4|m3u8))['"]/i);
    if (linkMatch?.[1]) return linkMatch[1];

    // fallback
    return url;
  } catch (err) {
    console.error("❌ Failed to resolve URL:", err);
    return null;
  }
}

/**
 * Returns playable stream object(s) for a given URL.
 */
export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const finalLink = await resolveUrl(link, providerContext);
    if (!finalLink) return [];

    // Detect quality
    let quality: Stream["quality"] = "auto";
    const qMatch = finalLink.match(/\b(360|480|720|1080|2160)\b/);
    if (qMatch) quality = qMatch[0] as Stream["quality"];

    const type = finalLink.includes(".m3u8") ? "hls" : "mp4";

    return [
      {
        server: "Direct",
        url: finalLink,
        type,
        quality,
        headers,
      },
    ];
  } catch (err) {
    console.error("❌ Stream fetch error:", err);
    return [];
  }
}
