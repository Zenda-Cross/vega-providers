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
  const baseUrl = await getBaseUrl("multi");
  const url = `${baseUrl + filter}page/${page}/`;
  return posts({ url, signal, cheerio });
};

export const getSearchPosts = async function ({
  searchQuery,

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
  const baseUrl = await getBaseUrl("multi");
  const url = `${baseUrl}/?s=${searchQuery}`;
  console.log("multiGetPosts url", url);
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
    $(".items.full,.result-item")
      .children()
      .map((i, element) => {
        console.log("multiGetPosts element", element);
        const title = $(element).find(".poster,.image").find("img").attr("alt");
        const link = $(element).find(".poster,.image").find("a").attr("href");
        const image =
          $(element).find(".poster,.image").find("img").attr("data-src") ||
          $(element).find(".poster,.image").find("img").attr("src");
        if (title && link && image) {
          catalog.push({
            title: title,
            link: link,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    console.error("multiGetPosts error ", err);
    return [];
  }
}
