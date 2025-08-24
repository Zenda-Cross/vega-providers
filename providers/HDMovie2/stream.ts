import { ProviderContext } from "../types";

export async function getStream(url: string, providerContext: ProviderContext) {
  try {
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
    });
    const $ = providerContext.cheerio.load(res.data || "");

    const base = "https://hdmovie2.africa";

    const streams: { quality: string; url: string }[] = [];

    // ✅ 1. Normal iframe embeds
    $("iframe").each((i, el) => {
      const src = $(el).attr("src");
      if (!src) return;

      streams.push({
        quality: "HD",
        url: src.startsWith("/") ? base + src : src,
      });
    });

    // ✅ 2. Download links / onclick links
    $(".download-links a, .download a, .entry-content a, a.btn").each((i, el) => {
      const $el = $(el);
      let href = $el.attr("href") || $el.data("href") || "";
      if (!href) {
        const onclick = $el.attr("onclick");
        if (onclick) {
          const match = onclick.match(/'(https?:\/\/[^']+)'/);
          if (match) href = match[1];
        }
      }
      if (!href) return;

      // Quality detection
      let quality = "";
      const qMatch = $el.text().match(/(\d{3,4}P|4K|HD|1080|720)/i);
      if (qMatch) quality = qMatch[0].toUpperCase();

      streams.push({
        quality: quality || "HD",
        url: href.startsWith("/") ? base + href : href,
      });
    });

    return streams;
  } catch (err) {
    console.error("HDMovie2 getStream error:", err);
    return [];
  }
}


