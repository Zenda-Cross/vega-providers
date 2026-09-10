import { getBaseUrl } from "../getBaseUrl";
import { Info, Link, ProviderContext } from "../types";

const providerValue = "gokuHD";

function sourceHeading($: any, anchor: any): string {
  const container = anchor.closest("center, p, div");
  let heading = container.prevAll("h4, h3, h2").first();
  if (!heading.length) heading = anchor.prevAll("h4, h3, h2").first();
  return heading.text().replace(/\s+/g, " ").trim();
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl(providerValue);
  const pageUrl = new URL(link, `${baseUrl}/`).href;

  const response = await axios.get(pageUrl, {
    headers: {
      ...commonHeaders,
      Referer: `${baseUrl}/`,
    },
  });

  const $ = cheerio.load(response.data);
  const content = $(
    "article.single-entry-body, article, .inside-article, .entry-content, .post-content",
  ).first();
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  const pageText = content.text().replace(/\s+/g, " ");
  const type =
    /anime series|episodes?:|seasons?:/i.test(pageText) ||
    /season\s*\d+/i.test(title)
      ? "series"
      : "movie";
  const image =
    content.find("img").first().attr("data-lazy-src") ||
    content.find("img").first().attr("data-src") ||
    content.find("img").first().attr("src") ||
    "";
  const imdbId =
    $('a[href*="imdb.com"]').attr("href")?.match(/tt\d+/)?.[0] ||
    content.text().match(/tt\d{7,8}/)?.[0] ||
    "";
  const rating = pageText.match(/IMDb Rating:\s*([\d.]+)/i)?.[1] || "";
  const genresMatch = pageText.match(
    /Genres?:\s*([^|\n]+?)(?:\s+Language:|\s*\||\n|$)/i,
  );
  const tags = genresMatch
    ? genresMatch[1]
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  const synopsis =
    content
      .find("p")
      .filter((_, el) => {
        const t = $(el).text().trim();
        return (
          t.length > 20 &&
          !t.includes("Searching Keywords") &&
          !t.includes("Anime Info") &&
          !t.includes("DOWNLOAD")
        );
      })
      .first()
      .text()
      .trim() ||
    content.find(".post-meta + p").first().text().trim() ||
    content.find("p").first().text().trim();
  const links: Link[] = [];

  content
    .find("a[class*='wp-btn'], a[class*='download-btn']")
    .each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr("href") || "";
      if (
        !href ||
        href.startsWith("#") ||
        href.includes("vglist") ||
        href.includes("vegamovies") ||
        href.includes("rogmovies") ||
        href.includes("telegram") ||
        href.includes("whatsapp")
      ) {
        return;
      }
      const heading = sourceHeading($, anchor);
      const btnText = anchor.text().replace(/\s+/g, " ").trim();
      if (type === "series" && (/batch/i.test(btnText) || /batch\s*file|zip\s*file/i.test(heading))) {
        return;
      }
      const linkTitle = heading
        ? btnText
          ? `${heading} (${btnText})`
          : heading
        : btnText || `Source ${links.length + 1}`;
      const quality =
        (heading + " " + linkTitle).match(/\d{3,4}p/i)?.[0] || "";
      links.push({
        title: linkTitle,
        quality,
        episodesLink: type === "series" ? href : undefined,
        directLinks:
          type === "movie"
            ? [{ title: linkTitle, link: href, type: "movie" }]
            : [],
      });
    });

  return {
    title,
    image,
    synopsis,
    imdbId,
    type,
    tags,
    rating,
    linkList: links,
    webUrl: pageUrl,
  };
};
