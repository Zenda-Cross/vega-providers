import { Info, Link, ProviderContext } from "../types";

const hdbHeaders = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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

    if (!link.startsWith("http")) {
      link = new URL(link, "https://hdmovie2.srl").href;
    }

    const res = await axios.get(link, { headers: hdbHeaders });
    const $ = cheerio.load(res.data);

    // --- Title
    const title =
      $("h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.replace(" - Hdmovie2", "").trim() ||
      $("title").text().trim() ||
      "Unknown";

    // --- Image
    let image =
      $(".poster img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
    if (image && !image.startsWith("http")) image = new URL(image, link).href;

    // --- Synopsis (multiple fallbacks)
    let synopsis = "";
    // try content paragraphs
    $(".wp-content p, .entry-content p, .description, .synopsis").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 40 && !text.toLowerCase().includes("download")) {
        synopsis = text;
        return false; // break loop
      }
    });
    if (!synopsis) {
      synopsis =
        $("meta[property='og:description']").attr("content") ||
        $("meta[name='description']").attr("content") ||
        "";
    }

    // --- Genre, Cast
    const tags =
      $(".sgeneros a, .genres a, .genre a")
        .map((_, el) => $(el).text().trim())
        .get() || [];

    const cast =
      $(".cast .person a, .casting a, .actors a")
        .map((_, el) => $(el).text().trim())
        .get() || [];

    // --- Rating & IMDB
    let rating =
      $(".imdb span[itemprop='ratingValue']").text().trim() ||
      $(".ratingValue").text().trim() ||
      $("meta[itemprop='ratingValue']").attr("content") ||
      "";
    if (rating && !rating.includes("/")) {
      // normalize e.g. "7.5" -> "7.5/10"
      rating = rating + "/10";
    }

    const imdbLink =
      $(".imdb a[href*='imdb.com'], a[href*='imdb.com']").attr("href") || "";
    const imdbId = imdbLink ? imdbLink.split("/tt")[1]?.split("/")[0] ? "tt" + imdbLink.split("/tt")[1].split("/")[0] : "" : "";

    // --- Download links
    const downloadCandidates: Array<{ href: string; text: string; quality?: string }> = [];
    $(".download-container a[href], .downloads a[href], .dwnLink a[href]").each((_, el) => {
      let href = ($(el).attr("href") || "").trim();
      const text = ($(el).text() || "").trim();
      if (!href || !text) return;

      if (!href.startsWith("http")) href = new URL(href, link).href;

      const qualityMatch = text.match(
        /\b(240p|360p|480p|720p|1080p|2160p|4k|HDRip|HD|Full HD|BluRay|CAM|WEBRip)\b/i
      );
      const quality = qualityMatch ? qualityMatch[0] : "AUTO";

      downloadCandidates.push({ href, text, quality });
    });

    const links: Link[] = [];
    for (const d of downloadCandidates) {
      links.push({
        title: d.text,
        directLinks: [
          {
            link: d.href,
            title: d.text,
            quality: d.quality,
            type: "movie",
          },
        ],
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type: "movie",
      tags,
      cast,
      rating,
      linkList: links,
    };
  } catch (err) {
    console.error("HDMovie2 getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "",
      linkList: [],
    };
  }
};
