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

    // Title Cleaner
    let rawTitle =
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim();

    const title = rawTitle
      .replace(/Bolly4u/gi, "")
      .replace(/WB\s*DL/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.+?\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Detect type
    const type: "movie" | "series" = /season/i.test(title) ? "series" : "movie";

    // Synopsis
    const synopsis =
      $("article p")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(" ") ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // Image
    const image =
      $("article img").first().attr("src") ||
      $("article img").first().attr("data-src") ||
      $("meta[property='og:image']").attr("content") ||
      $("img").first().attr("src") ||
      "";

    // IMDb Id
    const imdbId =
      $('a[href*="imdb.com/title/tt"]')
        .attr("href")
        ?.match(/tt\d+/)?.[0] || "";

    const links: Link[] = [];
    const directLink: Link["directLinks"] = [];

    // --- Series episodes
    $('a:contains("Episode"), a:contains("EPiSODE")').each((_, el) => {
      const epTitle = $(el).text().trim();
      const epLink = $(el).attr("href");
      if (epLink) {
        directLink.push({
          title: epTitle,
          link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
          type: "episode",
        });
      }
    });

    // --- Movie / Quality links
    if (directLink.length === 0) {
      $('a')
        .filter((_, el) => /480|720|1080|2160|4K|mp4|m3u8/i.test($(el).text()))
        .each((_, el) => {
          const movieLink = $(el).attr("href");
          const linkTitle = $(el).text().trim();

          if (movieLink) {
            links.push({
              title: linkTitle,
              quality:
                $(el).text().match(/\b(480p|720p|1080p|2160p|4K|mp4|m3u8)\b/i)?.[0] || "",
              directLinks: [
                {
                  link: movieLink.startsWith("http") ? movieLink : new URL(movieLink, link).href,
                  title: "Movie",
                  type: "movie",
                },
              ],
            });
          }
        });
    }

    // If series links found
    if (directLink.length > 0) {
      links.push({
        title,
        directLinks: directLink,
      });
    }

    // --- Check for JS embedded streaming links
    const scriptData = $("script")
      .map((i, el) => $(el).html())
      .get()
      .join(" ");

    const jsLinks: { link: string; title: string; type: "movie" | "series" | "episode"; quality?: string }[] =
      [...scriptData.matchAll(/https?:\/\/[^'"]+\.(mp4|m3u8)/gi)].map(m => ({
        link: m[0],
        title: "Stream",
        type: "movie",
      }));

    if (jsLinks.length > 0) {
      links.push({
        title,
        directLinks: jsLinks,
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links,
    };
  } catch (err) {
    console.error("❌ Meta fetch error:", err);
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
