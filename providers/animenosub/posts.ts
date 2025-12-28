import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://animenosub.to",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

export function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter, page, query: "", signal, providerContext });
}

export function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ query: searchQuery, page, signal, providerContext });
}

function fetchPosts({
  filter,
  query,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  query?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  const baseUrl = "https://animenosub.to";

  let url = baseUrl;

  if (query && query.trim()) {
    const searchStr = encodeURIComponent(query.trim());
    url = `${baseUrl}/?s=${searchStr}${page > 1 ? `&paged=${page}` : ""}`;
  } else if (filter) {
    const clean = filter.startsWith("/")
      ? filter.replace(/\/$/, "")
      : `/${filter}`;
    url = `${baseUrl}${clean}${page > 1 ? `/page/${page}` : ""}`;
  } else {
    url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
  }

  return axios
    .get(url, { headers: defaultHeaders, signal })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const posts: Post[] = [];
      const seen = new Set<string>();

      const resolveUrl = (href?: string) =>
        href
          ? href.startsWith("http")
            ? href
            : new URL(href, baseUrl).href
          : "";

      $("article.bs").each((index, el) => {
        const card = $(el);
        const a = card.find("a").first();
        let link = resolveUrl(a.attr("href"));
        if (!link) return;

        // Remove episode from link
        link = link.replace(/-episode-\d+\/?$/i, "/");

        // Title
        const title =
          card.find(".tt h2").text().trim() ||
          a.attr("title")?.trim() ||
          "";
        if (!title) return;

        // Make unique key for React list
        const uniqueId = `${link}_${title}`;
        if (seen.has(uniqueId)) return;
        seen.add(uniqueId);

        // Image
        let image =
          card.find("img").attr("src") ||
          card.find("img").attr("data-src") ||
          "";
        if (image.startsWith("//")) image = "https:" + image;
        image = resolveUrl(image);

        posts.push({
          title,
          link,
          image,
        });
      });

      return posts.slice(0, 100); // max 100 posts per page
    })
    .catch((err: any) => {
      console.error("AnimeNoSub posts error:", err?.message || err);
      return [];
    });
}
