import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(link, {
      headers: {
        Referer: "https://google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);

    // --- Movie Title निकालना
    let title =
      $(".section-header").first().text().trim() || // main header
      $("title").text().trim() || // fallback
      $("meta[name='description']").attr("content")?.trim() || // meta description
      $("meta[property='og:title']").attr("content")?.trim() || // og:title
      "Unknown";

    // Remove unwanted stuff like .mkv, size info
    title = title
      .replace(/\.(mkv|mp4|avi)$/i, "")
      .replace(/\b(\d{3,4}p|hdrip|webrip|web-dl|bluray)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // --- Type (series or movie)
    const type = title.toLowerCase().includes("season") ? "series" : "movie";

    // --- Image निकालना
    const image =
      $("img.absmiddle").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    // --- Synopsis निकालना
    let synopsis = "";
    $(".section-header:contains('Movie Information')")
      .next(".list")
      .find("div")
      .each((_, el) => {
        const text = $(el).text().trim();
        if (text.toLowerCase().includes("storyline")) {
          synopsis = text.replace(/Storyline:/i, "").trim();
        }
      });

    // --- Links collect करना
    const links: Link[] = [];

    // 1. Download links
    $(".section-header:contains('Download')")
      .next(".list")
      .find("a")
      .each((_, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && text) {
          links.push({
            title: text.replace(/Download/i, "").trim(),
            directLinks: [
              {
                link: href,
                title: text,
                type,
                quality:
                  text.match(
                    /\b(480p|720p|1080p|2160p|4k|hdrip|webrip|web-dl|bluray)\b/i
                  )?.[0] || "",
              },
            ],
          });
        }
      });

    // 2. Server links (/servers/)
    $("a[href*='/servers/']").each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim() || `Server ${i + 1}`;
      if (href) {
        links.push({
          title: text,
          directLinks: [
            {
              link: href,
              title: text,
              type,
              quality: href.match(/\d+p/)?.[0] || "",
            },
          ],
        });
      }
    });

    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type,
      tags: [],
      cast: [],
      rating: "",
      linkList: links,
    };
  } catch (err) {
    console.error("OFilmyZilla getMeta error:", err);
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