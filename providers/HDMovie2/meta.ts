// providers/HDMovie2/meta.ts

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
    const url = link;
    const res = await axios.get(url, { headers: providerContext.commonHeaders });
    const $ = cheerio.load(res.data || "");
    const base = "https://hdmovie2.africa";

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

    let rating =
      $("span.rating, .rating, .imdb, .imdbRatingValue strong, .ratingValue").first().text().trim() ||
      $("meta[itemprop='ratingValue']").attr("content") ||
      "";
    const ratingMatch = rating.match(/\d+(\.\d+)?/);
    rating = ratingMatch ? ratingMatch[0] : "";

    const links: Link[] = [];
    $("a").each((i, el) => {
      const $el = $(el);
      let href = $el.attr("href") || $el.data("href") || "";
      if (!href) {
        const onclick = $el.attr("onclick");
        if (onclick) {
          const match = onclick.match(/'(https?:\/\/[^']+)'/);
          if (match) href = match[1];
        }
      }
      if (!href) return;

      let titleText = $el.text().trim() || $el.attr("title") || "Link";
      let quality = "";
      const qMatch = titleText.match(/(\d{3,4}P|4K|HD|1080|720)/i);
      if (qMatch) quality = qMatch[0].toUpperCase();

      let directLinkType: "movie" | "series" | "episode" = "episode";
      const lowerTitle = titleText.toLowerCase();
      const lowerHref = href.toLowerCase();

      if (
        lowerTitle.includes("play") ||
        lowerTitle.includes("stream") ||
        lowerHref.includes("embed") ||
        lowerHref.includes("player")
      ) {
        directLinkType = "episode"; // Or you can add logic to detect if it's a movie/series
      } else if (
        lowerTitle.includes("download") ||
        lowerTitle.includes("dl") ||
        lowerHref.includes(".mp4") ||
        lowerHref.includes(".mkv")
      ) {
        directLinkType = "episode";
      }

      // Instead of pushing an object with 'type', we push an object that has a 'directLinks' array
      // This conforms to your provided 'Link' interface.
      links.push({
        title: titleText,
        episodesLink: href.startsWith("/") ? base + href : href, // Use episodesLink as a fallback
        quality: quality || "HD",
        directLinks: [
          {
            title: titleText,
            link: href.startsWith("/") ? base + href : href,
            quality: quality || "HD",
            type: directLinkType,
          },
        ],
      });
    });

    const mediaType = title.toLocaleLowerCase().includes("season") ? "series" : "movie";

    return {
      title: title || "",
      synopsis: synopsis || "",
      image: image || "",
      imdbId: "",
      type: mediaType,
      linkList: links,
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


