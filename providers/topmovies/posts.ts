import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

async function fetchWithRetry(axios: any, url: string, config: any, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (err: any) {
      if ((err.code === "ECONNRESET" || err.message?.includes("ECONNRESET")) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw err;
    }
  }
}

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
  const baseUrl = await getBaseUrl("Topmovies");
  const url = `${baseUrl + filter}/page/${page}/`;

  return posts(baseUrl, url, signal, providerContext, "posts");
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
  const baseUrl = await getBaseUrl("Topmovies");
  const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;
  return posts(baseUrl, url, signal, providerContext, "search posts");
};

async function posts(
  baseUrl: string,
  url: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
  operation: string,
): Promise<Post[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const res = await fetchWithRetry(axios, url, { headers: commonHeaders, signal });
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".post-cards")
      .find("article")
      .map((i, element) => {
        const title = $(element).find("a").attr("title");
        const link = $(element).find("a").attr("href");
        const image =
          $(element).find("img").attr("data-src") ||
          $(element).find("img").attr("src") ||
          "";
        if (title && link) {
          catalog.push({
            title: title.replace("Download", "").trim(),
            link: (() => {
              const postUrl = new URL(link, `${baseUrl}/`);
              return `${postUrl.pathname}${postUrl.search}${postUrl.hash}`;
            })(),
            image: image,
          });
        }
      });
    // console.log(catalog);
    return catalog;
  } catch (err) {
    throwProviderError("TopMovies", operation, err);
  }
}
