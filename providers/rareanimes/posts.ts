import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const BASE_URL = "https://www.rareanimes.mov";
const DEFAULT_FILTER = "/category/animes/";

function parseUrl(value: string, baseUrl: string): URL | undefined {
  try {
    return new URL(value, baseUrl);
  } catch {
    return undefined;
  }
}

function getSiteUrl(value: string, baseUrl: string): string {
  const url = parseUrl(value, baseUrl);
  if (!url) throw new Error("RareAnimes returned an invalid URL");
  if (url.hostname !== new URL(BASE_URL).hostname) {
    throw new Error("RareAnimes links must stay on www.rareanimes.mov");
  }
  return url.href;
}

async function getHtml(
  url: string,
  providerContext: ProviderContext,
  operation: string,
  signal: AbortSignal,
): Promise<string> {
  let data: unknown;
  try {
    data = (
      await providerContext.axios.get(url, {
        headers: providerContext.commonHeaders,
        signal,
      })
    ).data;
  } catch (error) {
    throwProviderError("RareAnimes", operation, error);
  }
  if (typeof data !== "string") {
    throw new Error("RareAnimes returned a non-HTML response");
  }
  return data;
}

function parsePosts(
  html: string,
  pageUrl: string,
  providerContext: ProviderContext,
): Post[] {
  const $ = providerContext.cheerio.load(html);
  const posts: Post[] = [];

  $("article.herald-lay-b").each((_index, element) => {
    const article = $(element);
    const titleLink = article.find("h2 a, h3 a").first();
    const title = titleLink.text().replace(/\s+/g, " ").trim();
    const href = titleLink.attr("href");
    const image = article.find("img").first().attr("src");

    if (!title || !href || !image) return;

    const link = getSiteUrl(href, pageUrl);
    const imageUrl = parseUrl(image, pageUrl);
    if (!imageUrl) {
      throw new Error("RareAnimes returned an invalid thumbnail URL");
    }
    posts.push({ title, link, image: imageUrl.href });
  });

  return posts;
}

function getPageNumber(url: string): number {
  const match = new URL(url).pathname.match(/\/page\/(\d+)\/?$/);
  return match ? Number(match[1]) : 1;
}

function getPaginationLinks(
  html: string,
  pageUrl: string,
  providerContext: ProviderContext,
): { label: string; href: string }[] {
  const $ = providerContext.cheerio.load(html);
  const links: { label: string; href: string }[] = [];

  $(".pagination a, a.page-numbers").each((_index, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");
    if (!href) return;

    const url = parseUrl(href, pageUrl);
    if (!url || url.hostname !== new URL(BASE_URL).hostname) return;
    links.push({
      label: anchor.text().replace(/\s+/g, " ").trim(),
      href: url.href,
    });
  });

  return links;
}

export const getPosts = async function ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("RareAnimes page must be a positive integer");
  }

  let currentUrl = getSiteUrl(filter || DEFAULT_FILTER, BASE_URL);
  const visited = new Set<string>();

  while (!visited.has(currentUrl)) {
    visited.add(currentUrl);
    const html = await getHtml(currentUrl, providerContext, "getPosts", signal);
    const currentPage = getPageNumber(currentUrl);

    if (currentPage === page) {
      return parsePosts(html, currentUrl, providerContext);
    }
    if (currentPage > page) return [];

    const pagination = getPaginationLinks(html, currentUrl, providerContext);
    const requestedPage = pagination.find(
      (link) => link.label === String(page),
    );
    const nextPage = pagination.find(
      (link) => link.label.toLowerCase() === "next",
    );
    const destination = requestedPage || nextPage;
    if (!destination) return [];

    currentUrl = destination.href;
  }

  throw new Error("RareAnimes category pagination contains a URL cycle");
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (page !== 1) {
    throw new Error("RareAnimes search pagination has not been verified");
  }
  if (!searchQuery.trim()) return [];

  const searchUrl = new URL(BASE_URL);
  searchUrl.searchParams.set("s", searchQuery.trim());
  const url = searchUrl.href;
  const html = await getHtml(
    url,
    providerContext,
    "getSearchPosts",
    signal,
  );
  return parsePosts(html, url, providerContext);
};
