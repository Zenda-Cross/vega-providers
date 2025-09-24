import { Info, Link, ProviderContext } from "../types";

const hdbHeaders = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info & { extraInfo?: Record<string, string> }> {
  try {
    const { axios, cheerio } = providerContext;

    if (!link.startsWith("http")) {
      link = new URL(link, "https://allmovieshub.games").href;
    }

    const res = await axios.get(link, { headers: hdbHeaders });
    const $ = cheerio.load(res.data);

    // --- Title
    const title =
      $("h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim() ||
      "Unknown";

    // --- Image
    let image =
      $(".poster img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
    if (image && !image.startsWith("http")) image = new URL(image, link).href;

    // --- Synopsis
    let synopsis = "";
    $(".wp-content p, .entry-content p, .description, .synopsis").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 40 && !text.toLowerCase().includes("download")) {
        synopsis = text;
        return false;
      }
    });
    if (!synopsis) {
      synopsis =
        $("meta[property='og:description']").attr("content") ||
        $("meta[name='description']").attr("content") ||
        "";
    }

    // --- Tags / Genre
    const tags =
      $(".sgeneros a, .genres a, .genre a")
        .map((_, el) => $(el).text().trim())
        .get() || [];

    // --- Cast
    const cast =
      $(".cast .person a, .casting a, .actors a")
        .map((_, el) => $(el).text().trim())
        .get() || [];

    // --- Rating
    let rating =
      $(".imdb span[itemprop='ratingValue']").text().trim() ||
      $(".ratingValue").text().trim() ||
      $("meta[itemprop='ratingValue']").attr("content") ||
      "";
    if (rating && !rating.includes("/")) rating += "/10";

    // --- IMDb ID
    const imdbLink =
      $(".imdb a[href*='imdb.com'], a[href*='imdb.com']").attr("href") || "";
    const imdbId = imdbLink ? "tt" + imdbLink.split("/tt")[1]?.split("/")[0] : "";

    // --- Extra Info
    const extra: Record<string, string> = {};
    $("p, .info").each((_, el) => {
      const html = $(el).html() || "";
      const txt = $(el).text() || "";
      if (html.includes("Language")) extra.language = txt.split(":")[1]?.trim();
      if (html.includes("Release")) extra.year = txt.split(":")[1]?.trim();
      if (html.includes("Quality")) extra.quality = txt.split(":")[1]?.trim();
      if (html.includes("Format")) extra.format = txt.split(":")[1]?.trim();
      if (html.includes("Size")) extra.size = txt.split(":")[1]?.trim();
    });

    // --- Download / Episode Links
    const links: Link[] = [];
    $("h3 a[href], .download a[href]").each((_, el) => {
      let href = $(el).attr("href")?.trim() || "";
      let text = $(el).text().trim() || "";
      if (!href || !text) return;

      if (!href.startsWith("http")) href = new URL(href, link).href;

      links.push({
        title: text,
        directLinks: [
          {
            link: href,
            title: text,
            quality: text.match(/\b(480p|720p|1080p|HDTC|HDRip|BluRay)\b/i)?.[0] || "",
            type: "movie",
          },
        ],
      });
    });

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
      extraInfo: extra,
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
      extraInfo: {},
    };
  }
};
