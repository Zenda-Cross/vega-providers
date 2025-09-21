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

    // --- Title निकालना (main h1 + fallbacks)
    let title =
      $("h1.entry-title").first().text().trim() ||
      $("title").text().trim() ||
      $("meta[name='description']").attr("content")?.trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      "Unknown";

    // Clean unwanted parts
    title = title
      .replace(/\.(mkv|mp4|avi)$/i, "")
      .replace(/\b(\d{3,4}p|hdrip|webrip|web-dl|bluray|hdtc)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const type = title.toLowerCase().includes("season") ? "series" : "movie";

    const image =
      $(".entry-content img").first().attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    let synopsis = "";
    $(".imdbwp__summary").each((_, el) => {
      const text = $(el).text().trim();
      if (text) synopsis = text;
    });

    if (!synopsis) {
      $(".entry-content p").each((_, el) => {
        const text = $(el).text().trim();
        if (/storyline/i.test(text)) {
          synopsis = text.replace(/storyline[:]?/i, "").trim();
        }
      });
    }

    // --- Download Links निकालना (with quality + size from <h6> span)
    const links: Link[] = [];

    $("h6").each((i, el) => {
      const fileName = $(el).text().trim();
      const nextAnchors = $(el).nextAll("a");

      nextAnchors.each((_, a) => {
        const href = $(a).attr("href");
        const provider = $(a).attr("title") || $(a).text().trim();
        if (href) {
          links.push({
            title: fileName,
            directLinks: [
              {
                link: href,
                title: provider,
                type,
                quality:
                  fileName.match(
                    /\b(480p|720p|1080p|2160p|4k|hdrip|webrip|web-dl|bluray|hdtc)\b/i
                  )?.[0] || "",
              },
            ],
          });
        }
      });
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
    console.error("CineVood getMeta error:", err);
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