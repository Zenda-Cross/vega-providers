import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const url = link;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
    });
    const $ = providerContext.cheerio.load(res.data || "");

    // ✅ Title
    let title =
      $("h1.entry-title, h1.post-title, h1, .movie_title, .film-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().split("|")[0].trim() ||
      "";

    // ✅ Synopsis / Description
    let synopsis =
      $("div.synopsis, .summary, .post-content p, .entry-content p, .movie_synopsis").first().text().trim() ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // ✅ Image
    let image =
      $("meta[property='og:image']").attr("content") ||
      $("img.wp-post-image").attr("src") ||
      $("img.featured, .poster img, .cover img").attr("src") ||
      $("img").first().attr("src") ||
      "";

    // ✅ Base URL safe
    let base = "https://cinemalux.run";
    try {
      if (providerContext.getBaseUrl) {
        const maybeBase: any = await providerContext.getBaseUrl("cinemalux");
        if (typeof maybeBase === "string") {
          base = maybeBase;
        } else if (maybeBase && typeof maybeBase.url === "string") {
          base = maybeBase.url;
        }
      }
    } catch (e) {
      console.warn("getBaseUrl failed, using default:", e);
    }

    if (image && image.startsWith("/")) {
      image = base.replace(/\/$/, "") + image;
    }

    // ✅ Tags
    const tags: string[] = [];
    $("a[rel='tag'], .tags a, .post-categories a, .genres a").each((i: number, el: any) => {
      const t = $(el).text().trim();
      if (t) tags.push(t);
    });

    // ✅ Rating
    let rating =
      $("span.rating, .rating, .imdb, .imdbRatingValue strong, .ratingValue").first().text().trim() ||
      $("meta[itemprop='ratingValue']").attr("content") ||
      "";
    const ratingMatch = rating.match(/\d+(\.\d+)?/);
    rating = ratingMatch ? ratingMatch[0] : "";

    // ✅ Links
    const rawLinks: { titleText: string; href: string; quality: string }[] = [];
    $(
      ".download-links a, .download a, .post-content a, a.btn, .links a, .entry-content a, .watch_button a"
    ).each((i: number, el: any) => {
      const $el = $(el);
      let titleText = $el.text().trim();
      const href = $el.attr("href");
      if (!href) return;

      let quality = "";
      const qMatch = titleText.match(/(\d{3,4}P|4K|HD|1080|720)/i);
      if (qMatch) quality = qMatch[0].toLowerCase().replace("p", "p");

      if (titleText.includes("Download") || titleText === "") {
        titleText = $el.attr("title") || $el.parent().text().trim() || titleText;
      }

      rawLinks.push({ titleText, href, quality });
    });

    const links: Link[] = rawLinks.map((l) => ({
      title: l.titleText,
      episodesLink: l.href.startsWith("/")
        ? base.replace(/\/$/, "") + l.href
        : l.href,
      quality: l.quality,
    }));

    return {
      title: title || "",
      synopsis: synopsis || "",
      image: image || "",
      imdbId: "",
      type: links.length ? "series" : "movie",
      linkList: links,
      tags,
      rating,
    };
  } catch (err) {
    console.error("cinemalux getMeta error", err);
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



