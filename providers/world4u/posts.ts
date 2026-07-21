import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

export const getPosts = async function ({
  filter,
  page,
  // providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("w4u");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({ baseUrl, url, signal, axios, cheerio });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  // providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("w4u");
  const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
  return posts({ baseUrl, url, signal, axios, cheerio });
};

async function posts({
  baseUrl,
  url,
  signal,
  axios,
  cheerio,
}: {
  baseUrl: string;
  url: string;
  signal: AbortSignal;
  axios: ProviderContext["axios"];
  cheerio: ProviderContext["cheerio"];
}): Promise<Post[]> {
  try {
    const res = await axios.get(url, { signal });
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".recent-posts")
      .children()
      .map((i, element) => {
        const title = $(element).find(".post-thumb").find("a").attr("title");
        const link = $(element).find(".post-thumb").find("a").attr("href");
        const image =
          $(element).find(".post-thumb").find("img").attr("data-src") ||
          $(element).find(".post-thumb").find("img").attr("src");
        if (title && link && image) {
          const postUrl = new URL(link, `${baseUrl}/`);
          catalog.push({
            title: title.replace("Download", "").trim(),
            link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    return [];
  }
}
