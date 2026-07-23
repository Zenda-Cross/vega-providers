import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";

const providerValue = "gokuHD";

function normalizeLink(baseUrl: string, link: string): string {
  const url = new URL(link, `${baseUrl}/`);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function parsePosts(
  url: string,
  baseUrl: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`GokuHD returned ${response.status}`);

  const $ = providerContext.cheerio.load(await response.text());
  const posts: Post[] = [];
  $("article.col_item").each((_, element) => {
    const card = $(element);
    const anchor = card.find("h2 a, h3 a, a[href]").first();
    const href = anchor.attr("href") || "";
    const title = card
      .find("h2, h3")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const image =
      card.find("img").first().attr("data-lazy-src") ||
      card.find("img").first().attr("data-src") ||
      card.find("img").first().attr("src") ||
      "";
    if (!href || !title || !image) return;
    posts.push({ title, link: normalizeLink(baseUrl, href), image });
  });
  return posts;
}

export const getPosts = async function ({
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
  const path = filter ? `/${filter}/page/${page}/` : `/page/${page}/`;
  return parsePosts(
    new URL(path, `${baseUrl}/`).href,
    baseUrl,
    signal,
    providerContext,
  );
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery.trim()) return [];
  const baseUrl = await getBaseUrl(providerValue);
  const params = new URLSearchParams({
    search: searchQuery.trim(),
    per_page: "20",
    page: String(page),
    _embed: "1",
  });
  const response = await fetch(
    new URL(`/wp-json/wp/v2/posts?${params}`, `${baseUrl}/`).href,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) return [];

  const posts = (await response.json()) as any[];
  return posts.map((post) => ({
    title: String(post?.title?.rendered || "")
      .replace(/<[^>]+>/g, "")
      .replace(/&#8211;/g, "-")
      .replace(/&#8217;/g, "'")
      .replace(/&amp;/g, "&")
      .trim(),
    link: normalizeLink(baseUrl, post?.link || ""),
    image:
      post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
      post?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.medium
        ?.source_url ||
      "",
  }));
};
