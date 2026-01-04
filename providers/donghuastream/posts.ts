import { Post, ProviderContext } from "../types";

const BASE_URL = "https://donghuastream.org";

export async function getPosts({
  filter = "anime/?status=&type=&order=update&page=",
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  try {
    const url = `${BASE_URL}/${filter}${page}`;
    const res = await axios.get(url, { signal });
    const $ = cheerio.load(res.data || "");

    const posts: Post[] = [];

    $("div.listupd > article").each((_, el) => {
      const el$ = $(el);
      const title = el$.find("div.bsx > a").attr("title") || "";
      const href = el$.find("div.bsx > a").attr("href") || "";
      const poster = el$.find("div.bsx a img").attr("data-src") || "";

      if (title && href) {
        posts.push({
          title,
          link: href.startsWith("http") ? href : new URL(href, BASE_URL).href,
          image: poster.startsWith("http") ? poster : new URL(poster, BASE_URL).href,
        });
      }
    });

    return posts;
  } catch (err) {
    console.error("Donghuastream getPosts error:", err);
    return [];
  }
}

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
  const { axios, cheerio } = providerContext;

  try {
    const url = `${BASE_URL}/?s=${encodeURIComponent(searchQuery.trim())}`;
    const res = await axios.get(url, { signal });
    const $ = cheerio.load(res.data || "");

    const posts: Post[] = [];

    $("div.listupd > article").each((_, el) => {
      const el$ = $(el);
      const title = el$.find("div.bsx > a").attr("title") || "";
      const href = el$.find("div.bsx > a").attr("href") || "";
      const poster = el$.find("div.bsx a img").attr("data-src") || "";

      if (title && href) {
        posts.push({
          title,
          link: href.startsWith("http") ? href : new URL(href, BASE_URL).href,
          image: poster.startsWith("http") ? poster : new URL(poster, BASE_URL).href,
        });
      }
    });

    return posts;
  } catch (err) {
    console.error("Donghuastream getSearchPosts error:", err);
    return [];
  }
}
