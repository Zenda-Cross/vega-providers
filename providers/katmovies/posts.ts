import { Post, ProviderContext } from "../types";

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
        force: true,
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookies },
      });
    }
    throw error;
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
  const { getBaseUrl, cheerio, axios, openWebView, commonHeaders } =
    providerContext;
  const baseUrl = await getBaseUrl("kat");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({
    url,
    baseUrl,
    signal,
    cheerio,
    axios,
    openWebView,
    commonHeaders,
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
  const { getBaseUrl, cheerio, axios, openWebView, commonHeaders } =
    providerContext;
  const baseUrl = await getBaseUrl("kat");
  const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
  return posts({
    url,
    baseUrl,
    signal,
    cheerio,
    axios,
    openWebView,
    commonHeaders,
  });
};

async function posts({
  url,
  baseUrl,
  signal,
  cheerio,
  axios,
  openWebView,
  commonHeaders,
}: {
  url: string;
  baseUrl: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
  axios: ProviderContext["axios"];
  openWebView: ProviderContext["openWebView"];
  commonHeaders: any;
}): Promise<Post[]> {
  try {
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".recent-posts")
      .children()
      .map((i, element) => {
        const title = $(element).find("img").attr("alt");
        const link = $(element).find("a").attr("href");
        const image = $(element).find("img").attr("src");
        if (title && link && image) {
          catalog.push({
            title: title.replace("Download", "").trim(),
            link: link,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    console.error("katmovies error ", err);
    return [];
  }
}
