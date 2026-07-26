import { Post, ProviderContext } from "../types";
import { getMkvDramaPage, getMkvDramaUrl, toProviderPath } from "./request";

function addPage(path: string, page: number): string {
  const url = new URL(path, "https://mkvdrama.net/");
  if (page > 1) url.searchParams.set("page", String(page));
  return `${url.pathname}${url.search}`;
}

async function parsePosts(
  path: string,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const baseUrl = await getMkvDramaUrl("/");
  const response = await getMkvDramaPage(path, providerContext);
  const $ = providerContext.cheerio.load(response.data);
  const posts: Post[] = [];
  const seen = new Set<string>();

  $("article.bs").each((_, element) => {
    const card = $(element);
    const anchor = card.find("h2 a, h3 a, a[href]").first();
    const href = anchor.attr("href") || "";
    const title = card
      .find("h2, h3, .title")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const image =
      card.find("img").first().attr("data-src") ||
      card.find("img").first().attr("src") ||
      "";
    if (!href || !title || !image) return;

    const link = toProviderPath(href, baseUrl);
    if (seen.has(link)) return;
    seen.add(link);
    posts.push({ title, link, image: new URL(image, baseUrl).href });
  });

  return posts;
}

export async function getPosts({
  filter,
  page,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return parsePosts(addPage(filter || "/", page), providerContext);
}

export async function getSearchPosts({
  searchQuery,
  page,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery.trim()) return [];
  const params = new URLSearchParams({ q: searchQuery.trim() });
  if (page > 1) params.set("page", String(page));
  return parsePosts(`/search?${params}`, providerContext);
}
