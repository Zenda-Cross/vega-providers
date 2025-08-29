import { ProviderContext } from "../types";

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    const container = $("article, .entry-content").first();
    const streamLinks: { title: string; link: string; type: string; quality?: string }[] = [];
    const downloadLinks: { title: string; link: string; type: string, quality?: string }[] = [];
    const seen = new Set<string>();

    // --- Iframe streams (Primary Stream)
    $("iframe", container).each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-litespeed-src");
      if (!src) return;

      const finalLink = src.startsWith("http") ? src : new URL(src, link).href;
      if (seen.has(finalLink)) return;
      seen.add(finalLink);

      streamLinks.push({
        title: "Iframe Stream",
        link: finalLink,
        type: "stream",
      });
    });

    // --- Episode Download Links
    container.find('h3 a[href*="links.kmhd.net"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const finalLink = href.startsWith("http") ? href : new URL(href, link).href;
      if (seen.has(finalLink)) return;
      seen.add(finalLink);

      const linkText = $(el).text().trim();
      const qualityMatch = linkText.match(/(1080p|720p|480p)/i);
      const quality = qualityMatch ? qualityMatch[0] : "HD";

      downloadLinks.push({
          title: linkText,
          link: finalLink,
          type: 'download',
          quality: quality,
      });
    });

    // --- Script embedded mp4/m3u8 (Fallback)
    const scripts = $("script", container).map((i, el) => $(el).html()).get().join(" ");
    if (scripts) {
      const regex = /https?:\/\/[^\s'"]+\.(mp4|m3u8)/gi;
      const jsMatches = scripts.match(regex);
      
      if (jsMatches) {
        jsMatches.forEach((matchUrl) => {
          if (!seen.has(matchUrl)) {
            seen.add(matchUrl);
            streamLinks.push({
              title: "Script Stream",
              link: matchUrl,
              type: "stream",
            });
          }
        });
      }
    }

    return {
      streamLinks,
      downloadLinks,
    };
  } catch (err) {
    console.error("❌ PikaHD stream fetch error:", err);
    return {
      streamLinks: [],
      downloadLinks: [],
    };
  }
}