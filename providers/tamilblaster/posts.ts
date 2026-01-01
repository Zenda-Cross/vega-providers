import { Post, ProviderContext } from "../types";

const BASE_URL = "https://www.1tamilblasters.business";

export async function getPosts({
  page = 1,
  filter,
  providerContext,
}: {
  page?: number;
  filter?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  const url = `${BASE_URL}/page/${page}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const posts: Post[] = [];

  $("div.article-content-col").each((_, el) => {
    const card = $(el);

    const link = card.find("h2 a").attr("href");
    if (!link) return;

    const title = card.find("h2 a").text().trim();
    const image = card.find("img").attr("src") || "";

    posts.push({
      title,
      link,
      image,
    });
  });

  return posts;
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  const url = `${BASE_URL}/?s=${encodeURIComponent(searchQuery)}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const posts: Post[] = [];

  $("div.article-content-col").each((_, el) => {
    const card = $(el);

    const link = card.find("h2 a").attr("href");
    if (!link) return;

    const title = card.find("h2 a").text().trim();
    const image = card.find("img").attr("src") || "";

    posts.push({
      title,
      link,
      image,
    });
  });

  return posts;
}
