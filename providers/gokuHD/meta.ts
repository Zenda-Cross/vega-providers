import { getBaseUrl } from "../getBaseUrl";
import { Info, Link, ProviderContext } from "../types";

const providerValue = "gokuHD";

function sourceHeading($: any, anchor: any): string {
  const container = anchor.closest("center, p");
  let heading = container.prevAll("h4").first();
  if (!heading.length) heading = anchor.prevAll("h4").first();
  return heading.text().replace(/\s+/g, " ").trim();
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const baseUrl = await getBaseUrl(providerValue);
  const pageUrl = new URL(link, `${baseUrl}/`).href;
  const response = await fetch(pageUrl);
  if (!response.ok) throw new Error(`GokuHD returned ${response.status}`);

  const $ = providerContext.cheerio.load(await response.text());
  const content = $(
    "article.post-inner, .entry-content, .post-content",
  ).first();
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  const pageText = content.text().replace(/\s+/g, " ");
  const type = /anime series|episodes?:|season\s*:/i.test(pageText)
    ? "series"
    : "movie";
  const image =
    content.find("img").first().attr("data-lazy-src") ||
    content.find("img").first().attr("src") ||
    "";
  const imdbId =
    $('a[href*="imdb.com"]').attr("href")?.match(/tt\d+/)?.[0] || "";
  const rating = pageText.match(/IMDb Rating:\s*([\d.]+)/i)?.[1] || "";
  const genres = pageText.match(/Genres?:\s*([^|]+?)\s+Language:/i)?.[1] || "";
  const synopsis =
    content.find(".post-meta + p").first().text().trim() ||
    content.find("p").first().text().trim();
  const links: Link[] = [];

  content.find("a.wp-btn-2[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href") || "";
    if (!href) return;
    const heading = sourceHeading($, anchor);
    const quality = heading.match(/\d{3,4}p/i)?.[0] || "";
    links.push({
      title: heading || `Source 2 ${links.length + 1}`,
      quality,
      episodesLink: type === "series" ? href : undefined,
      directLinks:
        type === "movie"
          ? [{ title: heading || "Movie", link: href, type: "movie" }]
          : [],
    });
  });

  return {
    title,
    image,
    synopsis,
    imdbId,
    type,
    tags: genres
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    rating,
    linkList: links,
    webUrl: pageUrl,
  };
};
