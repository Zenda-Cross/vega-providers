import { Stream, ProviderContext } from "../types";

// universal Base64 decoder
function decodeBase64(input: string): string {
  try {
    if (typeof atob === "function") {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(input), (c: string) =>
            "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join("")
      );
    }
  } catch {}

  // Node.js fallback
  try {
    return Buffer.from(input, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  const streams: Stream[] = [];

  try {
    // Direct .m3u8 link check
    if (link.match(/\.m3u8(\?.*)?$/)) {
      streams.push({
        server: "Direct Link",
        link: link,
        type: "m3u8",
      });
    }

    const res = await axios.get(link, { headers: commonHeaders });
    const $ = cheerio.load(res.data || "");

    // Loop through mirror options
    for (const el of $("select.mirror option").toArray()) {
      const encoded = $(el).attr("value") || "";
      if (!encoded) continue;

      const decoded = decodeBase64(encoded).trim();
      if (!decoded) continue;

      const serverName = $(el).text().trim() || "Unknown";

      // Iframe detection
      const iframeMatch = decoded.match(/src\s*=\s*["']([^"']+)["']/);
      if (iframeMatch) {
        let src = iframeMatch[1];
        if (src.startsWith("//")) src = "https:" + src;

        try {
          // Fetch iframe page
          const iframeRes = await axios.get(src, { headers: commonHeaders });
          const m3u8Match = iframeRes.data.match(/(https?:\/\/[^\s'"]+\.m3u8[^\s'"]*)/);

          // Only push if .m3u8 exists
          if (m3u8Match) {
            streams.push({
              server: serverName,
              link: m3u8Match[1],
              type: "m3u8",
            });
          }
        } catch {
          // ignore if iframe fetch fails
          continue;
        }

        continue;
      }

      // Case: direct m3u8 in decoded HTML
      const m3u8Match = decoded.match(/(https?:\/\/[^\s'"]+\.m3u8[^\s'"]*)/);
      if (m3u8Match) {
        streams.push({
          server: serverName,
          link: m3u8Match[1],
          type: "m3u8",
        });
      }
    }

    return streams;
  } catch (err: any) {
    console.log("stream fetch error:", err?.message || err);
    return [];
  }
};
