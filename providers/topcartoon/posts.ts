import { Post, ProviderContext } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const BASE_URL = "https://www.topcartoons.tv";

// ---------------- NORMAL LIST ----------------
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

  const url = `${BASE_URL}/${filter || ""}`;

  return axios.get(url, { headers }).then((res: any) => {
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    $("article").each((_, el) => {
      const card = $(el);

      const link = card.find("a").attr("href");
      if (!link) return;

      const title =
        card.find("a > img").attr("alt")?.trim() || "";

      const image =
        card.find("a img").attr("data-src") ||
        card.find("a img").attr("src") ||
        "";

      posts.push({
        title,
        link: link.startsWith("http") ? link : BASE_URL + link,
        image: image.startsWith("http") ? image : BASE_URL + image,
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

  const url = `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`;

  return axios.get(url, { headers }).then((res: any) => {
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    $("article").each((_, el) => {
      const card = $(el);

      const link = card.find("a").attr("href");
      if (!link) return;

      const title =
        card.find("a > img").attr("alt")?.trim() || "";

      const image =
        card.find("a img").attr("data-src") ||
        card.find("a img").attr("src") ||
        "";

      posts.push({
        title,
        link: link.startsWith("http") ? link : BASE_URL + link,
        image: image.startsWith("http") ? image : BASE_URL + image,
      });
    });

    return posts;
  });
}
