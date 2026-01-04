import { Post, ProviderContext } from "../types";

const BASE_URL = "https://www.toontales.net";

// ---------------- POSTS ----------------
export function getPosts({
  filter,
  page = 1,
  providerContext,
}: {
  filter?: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  const url = filter
    ? `${BASE_URL}/${filter}/page/${page}/`
    : `${BASE_URL}/page/${page}/`;

  return axios.get(url).then((res: any) => {
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    $("section.ts-thumbnail-view div.item").each((_, el) => {
      const card = $(el);

      const anchor = card.find(".image-holder a");
      const img = anchor.find("img");

      const link = anchor.attr("href");
      if (!link) return;

      posts.push({
        title: img.attr("alt")?.trim() || "",
        link: link,
        image: img.attr("src") || "",
      });
    });

    return posts;
  });
}

// ---------------- SEARCH ----------------
export function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  const posts: Post[] = [];

  const url = `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}&search=Search`;

  return axios.get(url).then((res: any) => {
    const $ = cheerio.load(res.data);

    $("section.ts-thumbnail-view div.item").each((_, el) => {
      const card = $(el);

      const anchor = card.find(".image-holder a");
      const img = anchor.find("img");

      const link = anchor.attr("href");
      if (!link) return;

      if (posts.some((p) => p.link === link)) return;

      posts.push({
        title: img.attr("alt")?.trim() || "",
        link: link,
        image: img.attr("src") || "",
      });
    });

    return posts;
  });
}
