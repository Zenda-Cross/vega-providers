import { Post, ProviderContext } from "../types";

const BASE_URL = "https://anikototv.to";

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
  try {
    const { axios, cheerio } = providerContext;
    const delimiter = filter.includes("?") ? "&" : "?";
    const url = `${BASE_URL}${filter}${delimiter}page=${page}`;

    const res = await axios.get(url, {
      headers: {
        ...providerContext.commonHeaders,
        Referer: `${BASE_URL}/`,
      },
      signal,
    });

    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    $(".ani.items .item, .items .item, div.item").each((_, el) => {
      const linkEl = $(el).find("a.name.d-title, a[href*='/watch/'], a.name").first();
      let href = linkEl.attr("href") || "";
      if (!href) return;

      if (!href.startsWith("http")) {
        href = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      }

      const title =
        linkEl.text().trim() ||
        $(el).find(".name").text().trim() ||
        $(el).find("img").attr("alt") ||
        "";

      const image = $(el).find("img").attr("src") || "";

      if (title && href) {
        posts.push({
          title,
          link: href,
          image,
        });
      }
    });

    return posts;
  } catch (err) {
    console.error("Anikoto getPosts error:", err);
    return [];
  }
};

export const getSearchPosts = async function ({
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
  try {
    const { axios, cheerio } = providerContext;
    const url = `${BASE_URL}/filter?keyword=${encodeURIComponent(
      searchQuery
    )}&page=${page}`;

    const res = await axios.get(url, {
      headers: {
        ...providerContext.commonHeaders,
        Referer: `${BASE_URL}/`,
      },
      signal,
    });

    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    $(".ani.items .item, .items .item, div.item").each((_, el) => {
      const linkEl = $(el).find("a.name.d-title, a[href*='/watch/'], a.name").first();
      let href = linkEl.attr("href") || "";
      if (!href) return;

      if (!href.startsWith("http")) {
        href = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      }

      const title =
        linkEl.text().trim() ||
        $(el).find(".name").text().trim() ||
        $(el).find("img").attr("alt") ||
        "";

      const image = $(el).find("img").attr("src") || "";

      if (title && href) {
        posts.push({
          title,
          link: href,
          image,
        });
      }
    });

    return posts;
  } catch (err) {
    console.error("Anikoto getSearchPosts error:", err);
    return [];
  }
};
