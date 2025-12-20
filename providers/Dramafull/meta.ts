import { Info, Link, ProviderContext } from "../types";

// Headers
const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

/**
 * Extracts metadata and season/episode links from Dramafull drama page
 */
export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const baseUrl = "https://dramafull.cc";

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "tv",
    linkList: [],
  };

  try {
    const response = await axios.get(link, {
      headers: { ...headers, Referer: baseUrl },
    });

    const $ = cheerio.load(response.data);

    // -------------------------
    // TITLE
    // -------------------------
    const title =
      $("h1.film-name").first().text().trim() || "Unknown Title";

    // -------------------------
    // POSTER IMAGE
    // -------------------------
    let image =
      $(".film-poster img").attr("data-src") ||
      $(".film-poster img").attr("src") ||
      "";

    if (image.startsWith("//")) image = "https:" + image;
    if (image && !image.startsWith("http")) {
      image = baseUrl + image;
    }

    // -------------------------
    // SYNOPSIS
    // -------------------------
    const synopsis =
      $(".summary-content").text().trim() || "";

    // -------------------------
    // EPISODE / SEASON LINKS
    // -------------------------
    const linkList: Link[] = [];

    /**
     * HTML example:
     * Latest- Season 1 , Ep 17 ( SUB )
     * href="https://dramafull.cc/watch/41516-the-vendetta-of-an-2025-504937"
     */
    $(".last-episode a[href]").each((_, el) => {
      const a = $(el);
      const episodeUrl = a.attr("href");
      const text = a.text().replace(/\s+/g, " ").trim();

      if (!episodeUrl) return;

      // Extract season & episode numbers
      const seasonMatch = text.match(/Season\s*(\d+)/i);
      const episodeMatch = text.match(/Ep\s*(\d+)/i);

      const season = seasonMatch ? seasonMatch[1] : "1";
      const episode = episodeMatch ? episodeMatch[1] : "1";

      linkList.push({
        title: `Season ${season} Episode ${episode}`,
        quality: "HD",
        episodesLink: episodeUrl,
        directLinks: [
          {
            title: "Watch Episode",
            link: episodeUrl,
            
          },
        ],
      });
    });

    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type: "tv",
      linkList,
    };
  } catch (err) {
    console.error("getMeta error:", err);
    return emptyResult;
  }
};
