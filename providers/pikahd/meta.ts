import { Info, ProviderContext, Link } from "../types";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const baseUrl = "https://pikahd.eu";
    const res = await providerContext.axios.get(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        Referer: "https://www.google.com",
      },
    });

    const $ = providerContext.cheerio.load(res.data || "");

    const title = $("h1.entry-title").first().text().trim() || "";
    const synopsis = $("div.entry-content p").first().text().trim() || "";

    let image =
      $("meta[property='og:image']").attr("content") ||
      $("img.wp-post-image").attr("src") ||
      "";
    if (image.startsWith("/")) image = baseUrl + image;

    const links: Link[] = [];
    let isSeries = false;

    const directLinks: Link["directLinks"] = [];

    $("a").each((i, aEl) => {
      const href = $(aEl).attr("href") || $(aEl).data("href") || "";
      const text = ($(aEl).text() || "").trim();
      if (!href) return;

      const fullHref = href.startsWith("/") ? baseUrl + href : href;

      // Episode detection
      if (href.includes("/episode-") || /s\d+e\d+/i.test(href) || /episode \d+/i.test(text)) {
        directLinks.push({
          title: `Play - ${text || `Episode ${i + 1}`}`,
          link: fullHref,
          type: "episode",
        });
        isSeries = true;
      }
      // Movie detection
      else if (text.toLowerCase().includes("play") || text.toLowerCase().includes("download")) {
        directLinks.push({
          title: text.toLowerCase().includes("download") ? "Download" : "Play",
          link: fullHref,
          type: "movie",
        });
      }
    });

    if (directLinks.length > 0) {
      links.push({
        title: title || (isSeries ? "Episodes" : "Movie"),
        directLinks,
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type: isSeries ? "series" : "movie",
      linkList: links,
    };
  } catch (err) {
    console.error("pikahd getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
}


