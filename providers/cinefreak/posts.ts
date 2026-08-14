import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const providerValue = "cinefreak";
const defaultBaseUrl = "https://cinefreak.net";

function toPath(link: string, baseUrl: string): string {
  try {
    const url = new URL(link, baseUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return link;
  }
}

async function fetchPosts(
  url: string,
  baseUrl: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    const response = await axios.get(url, {
      headers: {
        ...commonHeaders,
        Referer: `${baseUrl}/`,
      },
      signal,
    });

    const $ = cheerio.load(response.data || "");
    const posts: Post[] = [];

    $(".movie-card").each((_, element) => {
      const card = $(element);
      const link = card.attr("href") || card.find("a").attr("href") || "";
      const image =
        card.find("img").attr("src") ||
        card.find("img").attr("data-src") ||
        "";
      const title =
        card.find(".movie-card-title").text().replace(/\s+/g, " ").trim() ||
        card.attr("aria-label")?.replace(/ details$/i, "")?.trim() ||
        card.find("img").attr("alt")?.trim() ||
        "";

      if (title && link) {
        posts.push({
          title,
          link: toPath(link, baseUrl),
          image,
        });
      }
    });

    return posts;
  } catch (error: any) {
    throwProviderError("CineFreak", "posts", error);
    return [];
  }
}

export async function getPosts({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const baseUrl = (await getBaseUrl(providerValue)) || defaultBaseUrl;
  const cleanFilter = filter ? filter.replace(/\/+$/, "") : "";
  const pageUrl =
    page <= 1
      ? `${baseUrl}${cleanFilter}/`
      : `${baseUrl}${cleanFilter}/page/${page}/`;

  return fetchPosts(pageUrl, baseUrl, signal, providerContext);
}

export async function getSearchPosts({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const baseUrl = (await getBaseUrl(providerValue)) || defaultBaseUrl;
  const encodedQuery = encodeURIComponent(searchQuery.trim());
  const searchUrl =
    page <= 1
      ? `${baseUrl}/?s=${encodedQuery}`
      : `${baseUrl}/page/${page}/?s=${encodedQuery}`;

  return fetchPosts(searchUrl, baseUrl, signal, providerContext);
}
