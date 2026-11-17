import { Post, ProviderContext } from "../types";
import { getPage } from "./request";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

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
  const { axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("Moviesmod");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({
    baseUrl,
    url,
    signal,
    axios,
    cheerio,
    operation: "posts",
    providerContext,
  });
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
  const { axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("Moviesmod");
  const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
  return posts({
    baseUrl,
    url,
    signal,
    axios,
    cheerio,
    operation: "search posts",
    providerContext,
  });
};

async function posts({
  baseUrl,
  url,
  signal,
  axios,
  cheerio,
  operation,
  providerContext,
}: {
  baseUrl: string;
  url: string;
  signal: AbortSignal;
  axios: ProviderContext["axios"];
  cheerio: ProviderContext["cheerio"];
  operation: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const res = await getPage(url, providerContext, signal);
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".post-cards")
      .find("article")
      .map((i, element) => {
        const title = $(element).find("a").attr("title");
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src");
        if (title && link && image) {
          const postUrl = new URL(link, `${baseUrl}/`);
          catalog.push({
            title: title,
            link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    throwProviderError("MoviesMod", operation, err);
  }
}
