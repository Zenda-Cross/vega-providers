import { Info, Link, ProviderContext } from "../types";
import { getMkvDramaPage, getMkvDramaUrl } from "./request";

function fieldValue($: any, label: string): string {
  let value = "";
  $(".spe .info-item").each((_: number, element: any) => {
    const item = $(element);
    if (item.find("b").first().text().trim().toLowerCase() !== label) return;
    value = item
      .clone()
      .find("b, i, time, meta")
      .remove()
      .end()
      .text()
      .replace(/\s+/g, " ")
      .trim();
  });
  return value;
}

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  provider: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const response = await getMkvDramaPage(link, providerContext);
  const pageUrl = response.url || (await getMkvDramaUrl(link));
  const $ = providerContext.cheerio.load(response.data);
  const typeLabel = fieldValue($, "type:");
  const type = /movie|special/i.test(typeLabel) ? "movie" : "series";
  const title = $("h1.entry-title").first().text().replace(/\s+/g, " ").trim();
  const image =
    $('meta[property="og:image"]').attr("content") ||
    $(".thumb img, .bigcontent img").first().attr("src") ||
    "";
  const synopsis =
    $(".entry-content").first().text().replace(/\s+/g, " ").trim() ||
    $('meta[name="description"]').attr("content") ||
    "";
  const tags = $(".genxed a")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);
  const cast = fieldValue($, "casts:")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const rating =
    $('[itemprop="ratingValue"]').attr("content") ||
    $(".numscore, .rating-prc .num").first().text().trim();
  const imdbId =
    $('a[href*="imdb.com/title/"]').attr("href")?.match(/tt\d+/)?.[0] || "";
  const linkList: Link[] = [
    type === "series"
      ? { title: "Episodes", episodesLink: link }
      : {
          title: "Download Links",
          directLinks: [{ title, link, type: "movie" }],
        },
  ];

  const quickDownload = await providerContext.kvStore?.get<boolean>("mkvDrama_quickDownload");

  return {
    title,
    image,
    synopsis,
    imdbId,
    type,
    quickDownload: quickDownload ?? true,
    tags,
    cast,
    rating,
    linkList,
    webUrl: pageUrl,
  };
}
