import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter = "/m/",
  page = 1,
  providerValue = "9xflix",
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  providerValue?: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, cheerio, axios } = providerContext;
  const baseUrl = await getBaseUrl(providerValue);
  let url = baseUrl.replace(/\/$/, "");
  url += filter.startsWith("/") ? filter : `/${filter}`;
  if (page > 1) url += `page/${page}/`;
  const res = await axios.get(url, { signal });
  const $ = cheerio.load(res.data);
  const posts: Post[] = [];
  $("a > img").each((_, el) => {
    const poster = $(el).attr("src");
    const title = $(el).attr("alt") || $(el).attr("title");
    const parent = $(el).parent("a");
    const link = parent.length ? parent.attr("href") : null;
    if (title && poster && link && !link.startsWith("#")) {
      posts.push({ title, image: poster, link });
    }
  });
  return posts;
};

export const getSearchPosts = async function ({
  searchQuery,
  page = 1,
  providerValue = "9xflix",
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerValue?: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, cheerio, axios } = providerContext;
  const baseUrl = await getBaseUrl(providerValue);
  const url = `${baseUrl}?s=${encodeURIComponent(searchQuery)}`;
  const res = await axios.get(url, { signal });
  const $ = cheerio.load(res.data);
  const posts: Post[] = [];
  $("a > img").each((_, el) => {
    const poster = $(el).attr("src");
    const title = $(el).attr("alt") || $(el).attr("title");
    const parent = $(el).parent("a");
    const link = parent.length ? parent.attr("href") : null;
    if (title && poster && link && !link.startsWith("#")) {
      posts.push({ title, image: poster, link });
    }
  });
  return posts;
};
