import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

// Normal catalog posts
export async function getPosts({
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

// Search posts
export async function getSearchPosts({
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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
}

// Core function
async function fetchPosts({
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
  try {
    const baseUrl = "https://hdmovie2.africa";
    let url: string;

    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
    } else {
      const normalizedFilter = filter || "";
      url = normalizedFilter.startsWith("http")
        ? normalizedFilter
        : `${baseUrl}/${normalizedFilter.replace(/^\/|\/$/g, "")}${page > 1 ? `/page/${page}` : ""}`;
    }

    const res = await providerContext.axios.get(url, { headers: defaultHeaders, signal });
    const $ = providerContext.cheerio.load(res.data || "");
    const catalog: Post[] = [];

    // Updated selectors for HDMovie2
    const selectors = [".pstr_box", "article", ".result-item", ".post", ".item", ".thumbnail"];
    selectors.forEach((sel) => {
      $(sel).each((i: number, el: any) => {
        const $el = $(el);
        const a = $el.find("a").first();
        if (!a) return;

        const title =
          $el.find("h2").text().trim() ||
          a.attr("title") ||
          a.find("img").attr("alt") ||
          a.text().trim() ||
          "";
        let link = a.attr("href") || "";
        let image =
          $el.find("img").attr("data-src") ||
          $el.find("img").attr("src") ||
          $el.find("img").attr("data-lazy-src") ||
          "";

        if (!title || !link || !image) return;

        if (link.startsWith("/")) link = baseUrl + link;
        if (image.startsWith("/")) image = baseUrl + image;

        catalog.push({ title, link, image });
      });
    });

    return catalog;
  } catch (err) {
    console.error(
      "HDMovie2 fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}



