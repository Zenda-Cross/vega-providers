import { Post, ProviderContext } from "../types";

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
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("showbox");
  const url = `${baseUrl + filter}?page=${page}/`;
  return posts({ url, signal, baseUrl, axios, cheerio });
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
  const { getBaseUrl, axios, cheerio, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl("showbox");
  const url = `${baseUrl}/search?keyword=${searchQuery}&page=${page}`;
  return posts({
    url,
    signal,
    baseUrl,
    axios,
    cheerio,
    headers: commonHeaders,
  });
};

async function posts({
  url,
  signal,
  // baseUrl,
  axios,
  cheerio,
  headers,
}: {
  url: string;
  signal: AbortSignal;
  baseUrl: string;
  axios: ProviderContext["axios"];
  cheerio: ProviderContext["cheerio"];
  headers?: Record<string, string>;
}): Promise<Post[]> {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.get(url, { signal, headers: headers });
      const data = res.data;
      console.log(data);
      const $ = cheerio.load(data);
      const catalog: Post[] = [];
      $(".movie-item,.flw-item").map((i, element) => {
        const title = $(element).find(".film-name").text().trim();
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src");
        console.log(title, link, image);
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
      lastError = err;
      if (signal.aborted || attempt === maxRetries) {
        throw err;
      }
    }
  }

  throw lastError;
}
