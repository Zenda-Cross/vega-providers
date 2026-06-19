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
  if (page > 1) {
    return [];
  }
  const { axios, commonHeaders } = providerContext;
  const baseUrl = "https://animetsu.net";
  const url = `${baseUrl}/v2/api/anime/home`;

  return posts({
    url,
    filter,
    signal,
    axios,
    providerContext,
    headers: commonHeaders,
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
  const { axios, commonHeaders } = providerContext;
  const baseUrl = "https://animetsu.net";
  const url = `${baseUrl}/v2/api/anime/search/?query=${encodeURIComponent(
    searchQuery,
  )}`;

  return posts({ url, signal, axios, providerContext, headers: commonHeaders });
};

async function posts({
  url,
  filter,
  signal,
  axios,
  providerContext,
  headers,
}: {
  url: string;
  filter?: string;
  signal: AbortSignal;
  axios: ProviderContext["axios"];
  providerContext: ProviderContext;
  headers?: Record<string, string>;
}): Promise<Post[]> {
  const baseUrl = "https://animetsu.net";
  const { openWebView } = providerContext;
  try {
    let cookies: string | undefined;
    let res: any;
    try {
      res = await axios.get(url, {
        signal,
        headers: {
          ...headers,
          Referer: baseUrl,
        },
      });
    } catch (error: any) {
      if (error.response?.status === 403) {
        const wafResult = await openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass Animetsu anti-bot protection.",
          headers: { ...headers, Referer: baseUrl },
          force: true,
          waitForCookie: "cf_clearance",
        });
        cookies = wafResult.cookies;
        res = await axios.get(url, {
          signal,
          headers: { ...headers, Referer: baseUrl, Cookie: cookies },
        });
      } else {
        throw error;
      }
    }
    const data = filter ? res.data?.[filter] : res.data?.results || res.data;
    const catalog: Post[] = [];

    data?.map((element: any) => {
      const title =
        element.title?.english ||
        element.title?.romaji ||
        element.title?.native;
      const link = element.id?.toString();
      const image =
        element.cover_image?.large ||
        element.cover_image?.extraLarge ||
        element.cover_image?.medium ||
        element.cover_image?.small ||
        element.coverImage?.large ||
        element.coverImage?.extraLarge ||
        element.coverImage?.medium;

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
    console.error("animetsu error ", err);
    return [];
  }
}
