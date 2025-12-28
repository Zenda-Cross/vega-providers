import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://wb.animeluxe.org",
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
  const baseUrl = "https://wb.animeluxe.org";

  let url = baseUrl;

  if (query && query.trim()) {
    const searchStr = encodeURIComponent(query.trim());
    url = `${baseUrl}/anime?s=${searchStr}${page > 1 ? `&paged=${page}` : ""}`;
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

      // ✅ FIXED SELECTOR (search + normal)
      $(".media-block .search-card, .media-block .anime-card").each((_, el) => {
        const card = $(el);

        const link = resolveUrl(card.find("a.image").attr("href"));
        if (!link || seen.has(link)) return;

        const title =
          card.find(".info h3").text().trim() ||
          card.find("a.image").attr("title")?.trim() ||
          "";

        if (!title) return;

        let image =
          card.find("a.image").attr("data-src") ||
          card.find("a.image img").attr("src") ||
          "";

        if (image.startsWith("//")) image = "https:" + image;
        image = resolveUrl(image);

        seen.add(link);

        posts.push({
          title,
          link,
          image,
        });
      });

      return posts.slice(0, 100);
    })
    .catch((err: any) => {
      console.error("AnimeLuxe posts error:", err?.message || err);
      return [];
    });
}
