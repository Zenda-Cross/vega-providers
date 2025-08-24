import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, commonHeaders, getBaseUrl } = providerContext;
    const base = (await getBaseUrl("HDMovie2")) || "https://hdmovie2.africa";

    const res = await axios.get(link, { headers: commonHeaders });
    const $ = cheerio.load(res.data || "");

    const title =
      $("h1.entry-title, h1.post-title, h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().split("|")[0].trim() ||
      "";

    const synopsis =
      $("div.synopsis, .summary, .entry-content p").first().text().trim() ||
      $("meta[name='description']").attr("content") ||
      "";

    let image =
      $("meta[property='og:image']").attr("content") ||
      $("img.wp-post-image").attr("src") ||
      $("img.featured, .poster img, .cover img").attr("src") ||
      "";
    if (image.startsWith("/")) image = base + image;

    const tags: string[] = [];
    $("a[rel='tag'], .tags a, .post-categories a, .genres a").each((i, el) => {
      const t = $(el).text().trim();
      if (t) tags.push(t);
    });

    const ratingRaw =
      $("span.rating, .rating, .imdb, .imdbRatingValue strong, .ratingValue")
        .first()
        .text()
        .trim() || $("meta[itemprop='ratingValue']").attr("content") || "";
    const ratingMatch = ratingRaw.match(/\d+(\.\d+)?/);
    const rating = ratingMatch ? ratingMatch[0] : "";

    const imdbId =
      $("a[href*='imdb.com/title/tt']")
        .attr("href")
        ?.split("/tt")[1]
        ?.split("/")[0] || "";

    const linkList: Link[] = [];
    const allLinks: Link["directLinks"] = [];

    // Collect all movie links (Play / Download)
    $("a, button").each((_, el) => {
      const $el = $(el);
      let href = $el.attr("href") || $el.data("href") || "";
      const lowerText = $el.text().trim().toLowerCase();

      if (!href || href.startsWith("#") || href.startsWith("javascript:void(0)")) return;

      if (href.startsWith("/")) href = base + href;
      const qualityMatch = lowerText.match(/\d{3,4}p|4k|hd/);
      const quality = qualityMatch ? qualityMatch[0].toUpperCase() : "auto";

      if (lowerText.includes("play") || lowerText.includes("stream")) {
        allLinks.push({ title: "Play", link: href, type: "movie", quality });
      } else if (lowerText.includes("download")) {
        allLinks.push({ title: "Download", link: href, type: "movie", quality });
      }
    });

    // Detect if series
    const isSeries = $(".episodios li, .episode-list li, .episodes li").length > 0;

    if (isSeries) {
      const episodeLinkMap: { [key: string]: Link["directLinks"] } = {};

      $(".episodios li a, .episode-list li a, .episodes li a").each((i, el) => {
        const $el = $(el);
        let href = $el.attr("href") || "";
        const lowerText = $el.text().trim().toLowerCase();
        if (!href) return;

        if (href.startsWith("/")) href = base + href;
        const qualityMatch = lowerText.match(/\d{3,4}p|4k|hd/);
        const quality = qualityMatch ? qualityMatch[0].toUpperCase() : "auto";

        const epTitle = $el.text().trim() || `Episode ${i + 1}`;

        if (!episodeLinkMap[epTitle]) episodeLinkMap[epTitle] = [];

        if (lowerText.includes("play") || lowerText.includes("stream")) {
          episodeLinkMap[epTitle].push({ title: "Play", link: href, type: "episode", quality });
        } else if (lowerText.includes("download")) {
          episodeLinkMap[epTitle].push({ title: "Download", link: href, type: "episode", quality });
        } else {
          // default Play if not specified
          episodeLinkMap[epTitle].push({ title: "Play", link: href, type: "episode", quality });
        }
      });

      for (const [epTitle, links] of Object.entries(episodeLinkMap)) {
        if (links && links.length > 0) {
          linkList.push({ title: epTitle, directLinks: links });
        }
      }
    } else {
      // Single movie
      if (allLinks.length > 0) {
        linkList.push({ title: title || "Movie", directLinks: allLinks });
      } else {
        // fallback
        linkList.push({ title: "Play", directLinks: [{ title: "Play", link, type: "movie", quality: "auto" }] });
      }
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type: isSeries ? "series" : "movie",
      linkList,
      tags,
      rating,
    };
  } catch (err) {
    console.error("HDMovie2 getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
      tags: [],
      rating: "",
    };
  }
};



