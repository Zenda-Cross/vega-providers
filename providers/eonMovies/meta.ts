import { getBaseUrl } from "../getBaseUrl";
import { Info, Link, ProviderContext } from "../types";

const providerValue = "eonMovies";

function getTitle($: any): string {
  const openGraphTitle = $('meta[property="og:title"]').attr("content") || "";
  return openGraphTitle
    .replace(/\s+-\s+Download in HD\s*\|\s*EonMovies\s*$/i, "")
    .trim();
}

function getBackdrop($: any): string {
  const style = $("#heroBackdrop").attr("style") || "";
  return (
    style.match(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/i)?.[1] || ""
  );
}

function getTags($: any): string[] {
  const genres = $("#movieGenresBox .genre-pill")
    .map((_: number, element: any) => $(element).text().trim())
    .get()
    .filter(Boolean);
  const metadata = $(".meta-pill")
    .map((_: number, element: any) =>
      $(element).text().replace(/\s+/g, " ").trim(),
    )
    .get()
    .filter((value: string) =>
      /^(?:Movie|Series|WEB-DL|Hindi|English|Dual Audio)$/i.test(value),
    );

  return [...new Set([...genres, ...metadata])].slice(0, 3) as string[];
}

function getDownloadLinks($: any, baseUrl: string): Link[] {
  const directLinks: NonNullable<Link["directLinks"]> = [];

  $(".dl-row").each((_: number, element: any) => {
    const row = $(element);
    const title =
      row.attr("data-dlname") ||
      row.find(".dl-row-name").text().replace(/\s+/g, " ").trim();
    const href = row.find("a[href*='/dl/']").attr("href") || "";
    if (!title || !href) return;

    directLinks.push({
      title,
      link: new URL(href, `${baseUrl}/`).href,
    });
  });

  return directLinks.length ? [{ title: "Downloads", directLinks }] : [];
}

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const baseUrl = await getBaseUrl(providerValue);
  const url = new URL(link, `${baseUrl}/`).href;
  const response = await providerContext.axios.get(url);
  const $ = providerContext.cheerio.load(response.data || "");
  const title = getTitle($);
  const image = getBackdrop($);
  const synopsis = $(".overview-text")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const type = $(".meta-pills").text().includes("Series") ? "series" : "movie";

  return {
    title,
    image,
    synopsis,
    imdbId: "",
    type,
    tags: getTags($),
    linkList: getDownloadLinks($, baseUrl),
    webUrl: url,
  };
}
