import { Info, Link, ProviderContext } from "../types";

const headers = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    const container = $("article, .entry-content").first();

    // --- Title
    let rawTitle =
      container.find("h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim();
    const title = rawTitle
      .replace(/PikaHD/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.+?\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // --- Type
    const type: "movie" | "series" = /season|episode|ep\s*\d+/i.test(title)
      ? "series"
      : "movie";

    // --- Synopsis
    const synopsis =
      container
        .find("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .join(" ") ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // --- Image
    let image =
      $("meta[property='og:image']").attr("content") ||
      container.find("img.wp-post-image").attr("src") ||
      container.find("img").first().attr("src") ||
      "";
    if (image.startsWith("/")) image = `https://pikahd.eu${image}`;

    // --- IMDb Id
    const imdbId =
      $('a[href*="imdb.com/title/tt"]', container)
        .attr("href")
        ?.match(/tt\d+/)?.[0] || "";

    // --- Links
    const links: Link[] = [];
    const streamLinks: Link["directLinks"] = [];
    const downloadLinks: Link["directLinks"] = [];
    const seenLinks = new Set<string>();

    // --- Episodes (Play button)
    $('a:contains("Episode"), a:contains("EP"), .episodelist a, ul li a', container).each(
      (_, el) => {
        const epTitle = $(el).text().trim();
        const epLink = $(el).attr("href");
        if (!epLink) return;

        const finalLink = epLink.startsWith("http") ? epLink : new URL(epLink, link).href;
        if (seenLinks.has(finalLink)) return;
        seenLinks.add(finalLink);

        const numberMatch = epTitle.match(/(\d+)/);
        const episodeNumber = numberMatch ? numberMatch[0] : "Unknown";
        const fullTitle = `Episode ${episodeNumber} - ${title}`;

        streamLinks.push({
          title: fullTitle,
          link: finalLink,
          type: "episode",
        });
      }
    );

    // --- Download / Direct links (Download button)
    container.find("a").each((_, el) => {
      const linkText = $(el).text().trim();
      const href = $(el).attr("href");
      if (!href) return;

      const finalLink = href.startsWith("http") ? href : new URL(href, link).href;
      if (seenLinks.has(finalLink)) return;

      if (/download/i.test(linkText)) {
        seenLinks.add(finalLink);
        downloadLinks.push({
          title: linkText || "Download",
          link: finalLink,
          type: "movie",
        });
      } else if (/480|720|1080|2160|4K|mp4|m3u8/i.test(linkText) || /\.(mp4|m3u8)$/i.test(finalLink)) {
        // Stream link inside normal a tags
        seenLinks.add(finalLink);
        streamLinks.push({
          title: linkText || "Stream",
          link: finalLink,
          type: "movie",
          quality: linkText.match(/\b(480p|720p|1080p|2160p|4K)\b/i)?.[0] || "",
        });
      }
    });

    // --- Script embedded mp4/m3u8
    const scriptData = $("script", container)
      .map((_, el) => $(el).html())
      .get()
      .join(" ");
    const jsMatches = [...scriptData.matchAll(/https?:\/\/[^\s'"]+\.(mp4|m3u8)/gi)];
    jsMatches.forEach((m) => {
      if (!seenLinks.has(m[0])) {
        seenLinks.add(m[0]);
        streamLinks.push({
          title: "Stream Link",
          link: m[0],
          type: "movie",
        });
      }
    });

    // --- Iframe embedded streams
    $("iframe", container).each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      const finalLink = src.startsWith("http") ? src : new URL(src, link).href;
      if (!seenLinks.has(finalLink)) {
        seenLinks.add(finalLink);
        streamLinks.push({
          title: "Iframe Stream",
          link: finalLink,
          type: "movie",
        });
      }
    });

    // --- Push into final links array (always default empty array)
    links.push({
      title: title || "Episodes / Stream",
      directLinks: streamLinks || [],
    });

    links.push({
      title: title || "Download Links",
      directLinks: downloadLinks || [],
    });

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links || [],
    };
  } catch (err) {
    console.error("❌ PikaHD meta fetch error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};

