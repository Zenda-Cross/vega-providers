import { Post, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie:
    "_ga=GA1.1.10613951.1756380104; xla=s4t; _ga_1CG5NQ0F53=GS2.1.s1756380103$o1$g1$t1756380120$j43$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
};

export const getPosts = async ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> => {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("lux");

  console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
  const url = `${baseUrl}/${filter}/page/${page}/`;
  console.log("vegaGetPosts url:", url);
  return posts(baseUrl, url, signal, headers, axios, cheerio);
};

export const getSearchPosts = async ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> => {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("lux");

  console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
  const url = `${baseUrl}/search.php?q=${searchQuery}&page=${page}`;
  console.log("vegaGetPosts url:", url);

  try {
    const response = await axios.get(url, {
      headers: {
        ...headers,
        Referer: baseUrl,
      },
      signal,
    });

    const data = response.data;
    const posts: Post[] = [];

    if (data?.hits) {
      data.hits.forEach((hit: any) => {
        const doc = hit.document;
        const permalink = doc.permalink || "";
        const post = {
          title: doc.post_title.replace("Download", "").trim(),
          link: permalink.startsWith(baseUrl)
            ? permalink.slice(baseUrl.length) || "/"
            : permalink,
          image: doc.post_thumbnail,
        };
        posts.push(post);
      });
    }
    return posts;
  } catch (error) {
    console.error("vegaGetSearchPosts error:", error);
    return [];
  }
};

async function posts(
  baseUrl: string,
  url: string,
  signal: AbortSignal,
  headers: Record<string, string> = {},
  axios: ProviderContext["axios"],
  cheerio: ProviderContext["cheerio"],
): Promise<Post[]> {
  try {
    const urlRes = await fetch(url, {
      headers: {
        ...headers,
        Referer: baseUrl,
      },
      signal,
    });
    const $ = cheerio.load(await urlRes.text());
    const posts: Post[] = [];
    $(".blog-items,.post-list,#archive-container,.movies-grid")
      ?.children("article,.entry-list-item,a")
      ?.each((index, element) => {
        const href =
          $(element)?.find("a")?.attr("href") || $(element)?.attr("href") || "";
        const post = {
          title: (
            $(element)
              ?.find(".entry-title,.poster-title")
              ?.text()
              ?.replace("Download", "")
              ?.match(/^(.*?)\s*\((\d{4})\)|^(.*?)\s*\((Season \d+)\)/)?.[0] ||
            $(element)?.find("a")?.attr("title")?.replace("Download", "") ||
            $(element)
              ?.find(".post-title,.poster-title")
              .text()
              ?.replace("Download", "") ||
            ""
          ).trim(),

          link: href.startsWith(baseUrl)
            ? href.slice(baseUrl.length) || "/"
            : href,
          image:
            $(element).find("a").find("img").attr("data-lazy-src") ||
            $(element).find("a").find("img").attr("data-src") ||
            $(element).find("a").find("img").attr("src") ||
            $(element).find("img").attr("data-src") ||
            $(element).find("img").attr("src") ||
            "",
        };
        if (post.image.startsWith("//")) {
          post.image = "https:" + post.image;
        }
        console.log("vegaGetPosts post:", post);
        posts.push(post);
      });

    // console.log(posts);
    return posts;
  } catch (error) {
    console.error("vegaGetPosts error:", error);
    return [];
  }
}
