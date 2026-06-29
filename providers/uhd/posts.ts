import { Post, ProviderContext } from "../types";


export const getPosts = async ({
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
}): Promise<Post[]> => {
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("UhdMovies");
  const url =
    page === 1 ? `${baseUrl}/${filter}/` : `${baseUrl + filter}/page/${page}/`;
  console.log("url", url);

  return posts(baseUrl, url, signal, providerContext);
};

export const getSearchPosts = async ({
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
}): Promise<Post[]> => {
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("UhdMovies");
  const url = `${baseUrl}/search/${searchQuery}/page/${page}/`;

  return posts(baseUrl, url, signal, providerContext);
};

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
        force: true,
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}

async function posts(
  baseURL: string,
  url: string,
  signal: AbortSignal,
  providerContext: ProviderContext
): Promise<Post[]> {
  try {
    const { axios, cheerio, openWebView, commonHeaders } = providerContext;
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const html = res.data;
    const $ = cheerio.load(html);
    const uhdCatalog: Post[] = [];

    $(".gridlove-posts")
      .find(".layout-masonry")
      .each((index, element) => {
        const title = $(element).find("a").attr("title");
        const link = $(element).find("a").attr("href");
        const image = $(element).find("a").find("img").attr("src");

        if (title && link && image) {
          uhdCatalog.push({
            title: title.replace("Download", "").trim(),
            link: link,
            image: image,
          });
        }
      });
    return uhdCatalog;
  } catch (err) {
    console.error("uhd error ", err);
    return [];
  }
}
