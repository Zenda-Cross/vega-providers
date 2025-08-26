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
    const downloadLinks: { title: string; link: string; type: string }[] = [];
    const seen = new Set<string>();

    // --- Episodes / Play button
    $('a:contains("Episode"), a:contains("EP")', container).each((_, el: any) => {
      const epTitle = $(el).text().trim();
      const epLink = $(el).attr("href");
      if (!epLink) return;

      const finalLink = epLink.startsWith("http") ? epLink : new URL(epLink, link).href;
      if (seen.has(finalLink)) return;
      seen.add(finalLink);

      streamLinks.push({
        title: epTitle,
        link: finalLink,
        type: "episode",
      });
    });

    // --- Direct / quality links (mp4 / m3u8)
    container.find("a").each((_, el: any) => {
      const linkText = $(el).text().trim();
      const href = $(el).attr("href");
      if (!href) return;

      const finalLink = href.startsWith("http") ? href : new URL(href, link).href;
      if (seen.has(finalLink)) return;

      // Download links
      if (/download/i.test(linkText)) {
        seen.add(finalLink);
        downloadLinks.push({
          title: linkText || "Download",
          link: finalLink,
          type: "movie",
        });
      }
      // Stream links
      else if (/480|720|1080|2160|4K|mp4|m3u8/i.test(linkText) || /\.(mp4|m3u8)$/i.test(finalLink)) {
        seen.add(finalLink);
        streamLinks.push({
          title: linkText || "Stream",
          link: finalLink,
          type: "movie",
          quality: linkText.match(/\b(480p|720p|1080p|2160p|4K)\b/i)?.[0] || "",
        });
      }
    });

    // --- Script embedded mp4/m3u8
    const scripts = $("script", container).map((i, el) => $(el).html()).get().join(" ");
    const jsMatches = [...scripts.matchAll(/https?:\/\/[^\s'"]+\.(mp4|m3u8)/gi)];
    jsMatches.forEach((m) => {
      if (!seen.has(m[0])) {
        seen.add(m[0]);
        streamLinks.push({
          title: "Script Stream",
          link: m[0],
          type: "movie",
        });
      }
    });

    // --- Iframe streams
    $("iframe", container).each((_, el: any) => {
      const src = $(el).attr("src");
      if (!src) return;

      const finalLink = src.startsWith("http") ? src : new URL(src, link).href;
      if (seen.has(finalLink)) return;
      seen.add(finalLink);

      streamLinks.push({
        title: "Iframe Stream",
        link: finalLink,
        type: "movie",
      });
    });

    // --- Return combined object
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

