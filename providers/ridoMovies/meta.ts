import { Info, Link, ProviderContext } from "../types";

const headers = {
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
}): Promise<Info & { extraInfo: Record<string, string> }> {
  const { axios, cheerio } = providerContext;
  try {
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    // --- Title
    const title =
      $(".sheader h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      "";

    // --- Poster (fix with data-src fallback)
    let image =
      $(".sheader .poster img").attr("src") ||
      $(".sheader .poster img").attr("data-src") ||
      $("meta[property='og:image']").attr("content") ||
      "";
    if (image && !image.startsWith("http")) image = new URL(image, link).href;

    // --- Tagline
    const tagline = $(".sheader .tagline").text().trim();

    // --- Extra Info
    const date = $(".sheader .date").text().trim();
    const country = $(".sheader .country").text().trim();
    const runtime = $(".sheader .runtime").text().trim();
    const contentRating = $(".sheader .rated").text().trim();
    const rating =
      $(".starstruck-rating span[itemprop='ratingValue']").text().trim() || "";

    // --- Synopsis (remove unnecessary text, iframe, buttons etc.)
    let synopsis = "";
    $("#info .wp-content p").each((_, el) => {
      const txt = $(el).text().trim();
      if (
        txt &&
        txt.length > 30 &&
        !txt.toLowerCase().includes("watch online") &&
        !txt.toLowerCase().includes("download") &&
        !txt.toLowerCase().includes("share") &&
        !txt.toLowerCase().includes("support")
      ) {
        synopsis = txt;
        return false; // first clean paragraph only
      }
    });
    if (!synopsis) {
      synopsis =
        $("meta[name='description']").attr("content")?.trim() || "No synopsis available.";
    }

    // --- Genres
    const tags: string[] = [];
    $(".sgeneros a").each((_, el) => {
      const txt = $(el).text().trim();
      if (txt) tags.push(txt);
    });

    // --- Download Links (as you requested, unchanged)
    const links: Link[] = [];
    $(".movie-button-container a").each((_, el) => {
      let href = ($(el).attr("href") || "").trim();
      if (!href) return;
      if (!href.startsWith("http")) href = new URL(href, link).href;

      const btnText = $(el).text().trim();
      links.push({
        title: btnText,
        directLinks: [
          {
            link: href,
            title: btnText,
            quality: btnText.match(/1080p/i)
              ? "1080p"
              : btnText.match(/720p/i)
              ? "720p"
              : "AUTO",
            type: "movie",
          },
        ],
        episodesLink: href,
      });
    });

    // --- Extra Info Object
    const extra: Record<string, string> = {
      tagline,
      date,
      country,
      runtime,
      contentRating,
    };

    return {
      title,
      synopsis,
      image,
      imdbId: "", // site me imdb nahi tha
      type: "movie",
      tags,
      cast: [], // agar zarurat ho to aur scrape kar sakte hai
      rating,
      linkList: links,
      extraInfo: extra,
    };
  } catch (err) {
    console.error("getMeta error:", err);
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
