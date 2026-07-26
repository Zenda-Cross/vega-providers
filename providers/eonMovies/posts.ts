import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";

const providerValue = "eonMovies";

function toPath(link: string, baseUrl: string): string {
  const url = new URL(link, `${baseUrl}/`);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function fetchPosts(
  url: string,
  baseUrl: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const response = await providerContext.axios.get(url, { signal });
  const $ = providerContext.cheerio.load(response.data || "");
  const posts: Post[] = [];

  $(".image-container").each((_, element) => {
    const container = $(element);
    const anchor = container.closest("a[href]");
    const link = anchor.attr("href") || "";
    const image =
      container.find("img").attr("data-src") ||
      container.find("img").attr("src") ||
      "";
    const title =
      anchor.find(".card-title").text().replace(/\s+/g, " ").trim() ||
      container.find("img").attr("alt") ||
      "";

    if (title && link && image) {
      posts.push({ title, link: toPath(link, baseUrl), image });
    }
  });

  return posts;
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
  const baseUrl = await getBaseUrl(providerValue);
  const url = new URL("/", `${baseUrl}/`);
  url.search = new URLSearchParams({
    action: "",
    page: String(page),
    name: "",
    category: filter,
  }).toString();
  return fetchPosts(url.href, baseUrl, signal, providerContext);
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
  const baseUrl = await getBaseUrl(providerValue);
  const url = new URL("/", `${baseUrl}/`);
  url.search = new URLSearchParams({
    action: "search",
    page: String(page),
    name: searchQuery,
  }).toString();
  return fetchPosts(url.href, baseUrl, signal, providerContext);
}
