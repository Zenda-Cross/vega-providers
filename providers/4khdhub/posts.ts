import { Post, ProviderContext } from "../types";
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
  const { cheerio } = providerContext;
  const baseUrl = await getBaseUrl("4khdhub");
  const url = `${baseUrl + filter}/page/${page}`;
  console.log("4khdhubGetPosts url", url);
  return posts({ baseUrl, url, signal, cheerio, operation: "posts" });
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
  const { cheerio } = providerContext;
  const baseUrl = await getBaseUrl("4khdhub");
  const url =
    page == 1
      ? `${baseUrl}/?s=${searchQuery}`
      : `${baseUrl}/page/${page}?s=${searchQuery}`;
  console.log("4khdhubGetSearchPosts url", url);
  return posts({ baseUrl, url, signal, cheerio, operation: "search posts" });
};

async function posts({
  baseUrl,
  url,
  signal,
  cheerio,
  operation,
}: {
  baseUrl: string;
  url: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
  operation: string;
}): Promise<Post[]> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} | URL ${url}`);
    }
    const data = await res.text();
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".card-grid")
      .children()
      .map((i, element) => {
        const title = $(element).find(".movie-card-title").text();
        const link = $(element).attr("href");
        const image = $(element).find("img").attr("src");
        // console.log(
        //   "4khdhubGetPosts title",
        //   title,
        //   "link",
        //   link,
        //   "image",
        //   image
        // );
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
    throwProviderError("4KHDHub", operation, err);
  }
}
