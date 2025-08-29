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
    const type: "movie" | "series" = /season|episode|ep\s*\d+/i.test(rawTitle)
      ? "series"
      : "movie";

    // --- Synopsis
    const synopsis =
      $('h2:contains("Storyline")').next('p').text().trim() ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // --- Image
    let image =
      $("meta[property='og:image']").attr("content") ||
      container.find("img[fetchpriority='high']").attr("src") ||
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
    const seenLinks = new Set<string>();

    const episodeNumberMatch = rawTitle.match(/Episode\s*(\d+)/i);
    const seasonNumberMatch = rawTitle.match(/S(\d+)/i);
    let episodeNumber = episodeNumberMatch ? episodeNumberMatch[1] : "Unknown";
    let seasonNumber = seasonNumberMatch ? seasonNumberMatch[1] : "Unknown";

    // --- Iframe embedded streams (Primary Stream)
    const episodeLinks: Link["directLinks"] = [];
    $("iframe", container).each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      const finalLink = src.startsWith("http") ? src : new URL(src, link).href;
      if (!seenLinks.has(finalLink)) {
        seenLinks.add(finalLink);
        episodeLinks.push({
          title: `Main Stream (Season ${seasonNumber}, Episode ${episodeNumber})`,
          link: finalLink,
        });
      }
    });

    // --- Episode Download Links (Structured in <h3> tags)
    container.find('h3 a[href*="links.kmhd.net"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const finalLink = href.startsWith("http") ? href : new URL(href, link).href;
      if (seenLinks.has(finalLink)) return;
      seenLinks.add(finalLink);

      const linkText = $(el).text().trim(); // e.g., "E01: 1080p"
      const epMatch = linkText.match(/E(\d+)/i);
      const qualityMatch = linkText.match(/(1080p|720p|480p)/i);

      episodeNumber = epMatch ? epMatch[1] : episodeNumber;
      const quality = qualityMatch ? qualityMatch[0] : "HD";

      episodeLinks.push({
        title: `Season ${seasonNumber}, Episode ${episodeNumber} (${quality})`,
        link: finalLink,
        quality,
      });
    });

    if (episodeLinks.length > 0) {
      links.push({
        title: "Episodes",
        directLinks: episodeLinks,
      });
    }

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