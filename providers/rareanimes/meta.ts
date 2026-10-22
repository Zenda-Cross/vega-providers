import { Info, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const BASE_URL = "https://www.rareanimes.mov";

function parseUrl(value: string, baseUrl: string): URL | undefined {
  try {
    return new URL(value, baseUrl);
  } catch {
    return undefined;
  }
}

function getSiteUrl(value: string): string {
  const url = parseUrl(value, BASE_URL);
  if (!url) throw new Error("RareAnimes returned an invalid detail URL");
  if (url.hostname !== new URL(BASE_URL).hostname) {
    throw new Error("RareAnimes detail links must stay on www.rareanimes.mov");
  }
  return url.href;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const url = getSiteUrl(link);
  let data: unknown;
  try {
    data = (
      await providerContext.axios.get(url, {
        headers: providerContext.commonHeaders,
      })
    ).data;
  } catch (error) {
    throwProviderError("RareAnimes", "getMeta", error);
  }
  if (typeof data !== "string") {
    throw new Error("RareAnimes returned a non-HTML response");
  }

  const $ = providerContext.cheerio.load(data);
  const title =
    $(".entry-title").first().text().replace(/\s+/g, " ").trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";
  const synopsis =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $(".entry-content p").first().text().replace(/\s+/g, " ").trim() ||
    "";
  const image =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $("article img").first().attr("src")?.trim() ||
    "";

  if (!title || !synopsis || !image) {
    throw new Error(
      "RareAnimes detail page is missing title, description, or image",
    );
  }

  const seasons: Info["linkList"] = [];
  $(".entry-content a[href]").each((_index, element) => {
    const anchor = $(element);
    const seasonTitle = anchor.text().replace(/\s+/g, " ").trim();
    const href = anchor.attr("href");
    if (
      !href ||
      !seasonTitle ||
      !/(season|all episodes)/i.test(seasonTitle)
    ) {
      return;
    }

    const seasonPage = parseUrl(href, url);
    if (
      !seasonPage ||
      seasonPage.hostname !== new URL(BASE_URL).hostname ||
      seasonPage.href === url ||
      seasons.some(
        (season) => season.episodesLink === seasonPage.href,
      )
    ) {
      return;
    }
    seasons.push({ title: seasonTitle, episodesLink: seasonPage.href });
  });

  const imageUrl = parseUrl(image, url);
  if (!imageUrl) throw new Error("RareAnimes returned an invalid image URL");

  return {
    title,
    synopsis,
    image: imageUrl.href,
    imdbId: "",
    type: /\bmovie\b/i.test(`${title} ${synopsis}`) ? "movie" : "series",
    linkList: seasons,
    webUrl: url,
  };
};
