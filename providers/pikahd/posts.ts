import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

// General function to fetch posts from a URL
async function fetchPosts(url: string, providerContext: ProviderContext, signal?: AbortSignal): Promise<Post[]> {
  try {
    const res = await providerContext.axios.get(url, { headers: defaultHeaders, signal });
    const $ = providerContext.cheerio.load(res.data || "");
    const baseUrl = "https://pikahd.eu";
    const posts: Post[] = [];

    $(".post").each((_, el: any) => {
      const $el = $(el);
      const a = $el.find("a").first();
      const title = a.attr("title")?.trim() || a.text().trim();
      let link = a.attr("href")?.trim() || "";
      let image = $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";

      if (!title || !link || !image) return;

      if (link.startsWith("/")) link = baseUrl + link;
      if (image.startsWith("/")) image = baseUrl + image;

      posts.push({ title, link, image });
    });

    return posts;
  } catch (err) {
    console.error("pikahd fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

// Fetch posts for home / categories / filters
export async function getPosts({
  filter = "",
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const normalizedFilter = filter.endsWith("/") || filter === "" ? filter : filter + "/";
  const url = `https://pikahd.eu/${normalizedFilter}page/${page}/`;
  return fetchPosts(url, providerContext, signal);
}

// Fetch posts for search queries
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
  const query = encodeURIComponent(searchQuery.trim());
  const url = `https://pikahd.eu/?s=${query}&page=${page}`;
  return fetchPosts(url, providerContext, signal);
}

