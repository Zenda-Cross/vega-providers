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
  const baseUrl = await getBaseUrl("filmyfly");
  const url = `${baseUrl + filter}/${page}`;
  return posts({ url, signal, baseUrl, providerContext, operation: "posts" });
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
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  const baseUrl = await getBaseUrl("filmyfly");
  const url = `${baseUrl}/site-1.html?to-search=${searchQuery}`;
  if (page > 1) {
    return [];
  }
  return posts({
    url,
    signal,
    baseUrl,
    providerContext,
    operation: "search posts",
  });
};

async function posts({
  url,
  signal,
  baseUrl,
  providerContext,
  operation,
}: {
  url: string;
  signal: AbortSignal;
  baseUrl: string;
  providerContext: ProviderContext;
  operation: string;
}): Promise<Post[]> {
  try {
    const { cheerio, commonHeaders: headers } = providerContext;
    const res = await fetch(url, { headers, signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} | URL ${url}`);
    }
    const data = await res.text();
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".A2,.A10,.fl").map((i, element) => {
      const title =
        $(element).find("a").eq(1).text() || $(element).find("b").text();
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
    throwProviderError("FilmyFly", operation, err);
  }
}
