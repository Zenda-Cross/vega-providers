import { Post, ProviderContext } from "../types";

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
  const { getBaseUrl, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("moviezwap");
  const url = `${baseUrl}${filter}`;
  return posts({ url, signal, cheerio });
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
  const { getBaseUrl, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("moviezwap");
  const url = `${baseUrl}/search.php?q=${encodeURIComponent(searchQuery)}`;
  return posts({ url, signal, cheerio });
};

async function posts({
  url,
  signal,
  cheerio,
}: {
  url: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
}): Promise<Post[]> {
  try {
    const res = await fetch(url, { signal });
    const data = await res.text();
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $('a[href^="/movie/"]').each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      const image = "";
      if (title && link) {
        catalog.push({
          title: title,
          link: link,
          image: image,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("moviezwapGetPosts error ", err);
    return [];
  }
}
