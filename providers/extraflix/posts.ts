import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

const PROVIDER_NAME = "ExtraFlix";
const BASE_URL_KEY = "ExtraFlix";

type PostsArgs = {
  filter: string;
  page: number;
  providerValue: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
};

type SearchArgs = {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
};

function normalizeText(value: string | undefined | null): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function cleanCardTitle(value: string): string {
  return normalizeText(value.replace(/^Download\s+/i, ""));
}

function normalizePage(page: number): number {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/g, "");
}

function buildListingUrl(baseUrl: string, filter: string, page: number): string {
  const cleanFilter = (filter || "").trim().replace(/^\/+|\/+$/g, "");
  const path = cleanFilter ? `/${cleanFilter}/` : "/";
  const currentPage = normalizePage(page);
  const pagePart = currentPage > 1 ? `page/${currentPage}/` : "";
  return `${trimBaseUrl(baseUrl)}${path}${pagePart}`;
}

function absoluteImage(value: string, baseUrl: string): string {
  if (!value) return "";
  try {
    return new URL(value, `${trimBaseUrl(baseUrl)}/`).href;
  } catch {
    return "";
  }
}

function parseCards(
  html: string,
  baseUrl: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html);
  const cards = $("article.entry-card").length
    ? $("article.entry-card")
    : $(".entry-card");
  const posts: Post[] = [];
  const seen = new Set<string>();

  cards.each((_, element) => {
    const card = $(element);
    const titleAnchor = card.find(".entry-title a[href]").first();
    const mediaAnchor = card.find("a.ct-media-container[href]").first();
    const anchor = titleAnchor.length ? titleAnchor : mediaAnchor;
    const href = anchor.attr("href");
    const imageElement = card.find("img.wp-post-image").first().length
      ? card.find("img.wp-post-image").first()
      : card.find("img").first();
    const rawImage = imageElement.attr("src") || imageElement.attr("data-src") || "";
    const title = cleanCardTitle(
      card.find(".entry-title").first().text() ||
        anchor.attr("aria-label") ||
        imageElement.attr("alt") ||
        "",
    );

    if (!href || !title) return;

    let postUrl: URL;
    try {
      postUrl = new URL(href, `${trimBaseUrl(baseUrl)}/`);
    } catch {
      return;
    }
    if (postUrl.protocol !== "http:" && postUrl.protocol !== "https:") return;

    const link = `${postUrl.pathname}${postUrl.search}${postUrl.hash}`;
    if (seen.has(link)) return;
    seen.add(link);

    posts.push({
      title,
      link,
      image: absoluteImage(rawImage, baseUrl),
    });
  });

  return posts;
}

function parseSearchPayload(payload: unknown): any[] {
  let data: any = payload;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  return Array.isArray(data?.hits) ? data.hits : [];
}

function parseSearchPosts(
  payload: unknown,
  baseUrl: string,
): Post[] {
  const posts: Post[] = [];
  const seen = new Set<string>();

  for (const hit of parseSearchPayload(payload)) {
    const document = hit?.document || hit;
    if (!document) continue;

    const title = cleanCardTitle(
      document.t || document.post_title || document.title || "",
    );
    const href = document.u || document.permalink || document.url || "";
    const image = document.i || document.post_thumbnail || document.image || "";

    if (!title || !href) continue;

    let postUrl: URL;
    try {
      postUrl = new URL(href, `${trimBaseUrl(baseUrl)}/`);
    } catch {
      continue;
    }
    if (postUrl.protocol !== "http:" && postUrl.protocol !== "https:") continue;

    const link = `${postUrl.pathname}${postUrl.search}${postUrl.hash}`;
    if (seen.has(link)) continue;
    seen.add(link);

    posts.push({
      title,
      link,
      image: absoluteImage(image, baseUrl),
    });
  }

  return posts;
}

export const getPosts = async ({
  filter,
  page,
  signal,
  providerContext,
}: PostsArgs): Promise<Post[]> => {
  try {
    const baseUrl = await getBaseUrl(BASE_URL_KEY);
    if (!baseUrl) {
      throw new Error(`${BASE_URL_KEY} is not configured in urls.json`);
    }

    const { axios, cheerio, commonHeaders } = providerContext;
    const url = buildListingUrl(baseUrl, filter, page);
    const response = await axios.get(url, {
      headers: {
        ...commonHeaders,
        Referer: `${trimBaseUrl(baseUrl)}/`,
      },
      signal,
    });

    return parseCards(response.data, baseUrl, cheerio);
  } catch (error) {
    throwProviderError(PROVIDER_NAME, "posts", error);
  }
};

export const getSearchPosts = async ({
  searchQuery,
  page,
  signal,
  providerContext,
}: SearchArgs): Promise<Post[]> => {
  const query = (searchQuery || "").trim();
  if (!query) return [];

  try {
    const baseUrl = await getBaseUrl(BASE_URL_KEY);
    if (!baseUrl) {
      throw new Error(`${BASE_URL_KEY} is not configured in urls.json`);
    }

    const { axios, commonHeaders } = providerContext;
    const url = `${trimBaseUrl(baseUrl)}/api/search.php?q=${encodeURIComponent(
      query,
    )}&page=${normalizePage(page)}`;
    const response = await axios.get(url, {
      headers: {
        ...commonHeaders,
        Accept: "application/json",
        Referer: `${trimBaseUrl(baseUrl)}/`,
      },
      signal,
    });

    return parseSearchPosts(response.data, baseUrl);
  } catch (error) {
    throwProviderError(PROVIDER_NAME, "search posts", error);
  }
};
