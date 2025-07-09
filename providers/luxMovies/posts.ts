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
    "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=lDWFqLsHL5LZ.VpfxQRtHY2_mpXRuq3OFTbVDKNIZGw-1752051595-1.2.1.1-VZ2S8yUrcCuOMLUgWfNv9a1LrtuhUKEd.uPN1Au_9tuTFYLra7ugoFBYKfsunvzrBOlYSYM0q8J7vpw.JhGZH0RO6MlaVBKH5olmoryhd6s11LXg7ZF1Ld_NedYoA7uKk_SBhbb1CCsj11S52U9VUve7twrLEjILmw3MEURU1eGqOOi3YGxtGgpQBNYgfnkJCoRkLB_6vQESw4RcIvO1j1BHMuyMVEkbn7sBtLEX52w",
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
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("lux");

  console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
  const url = `${baseUrl}/${filter}/page/${page}/`;
  console.log("lux url:", url);
  return posts(url, signal, providerContext);
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
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("lux");

  console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
  const url =
    page === 1
      ? `${baseUrl}/?s=${searchQuery}`
      : `${baseUrl}/page/${page}/?s=${searchQuery}`;
  console.log("lux url:", url);

  return posts(url, signal, providerContext);
};

async function posts(
  url: string,
  signal: AbortSignal,
  providerContext: ProviderContext
): Promise<Post[]> {
  try {
    const { axios, cheerio } = providerContext;
    const urlRes = await axios.get(url, {
      headers: {
        ...headers,
        Referer: url,
      },
      signal,
    });
    const $ = cheerio.load(urlRes.data);
    const posts: Post[] = [];
    $(".blog-items")
      ?.children("article")
      ?.each((index, element) => {
        const post = {
          title:
            $(element)
              ?.find("a")
              ?.attr("title")
              ?.replace("Download", "")
              ?.match(/^(.*?)\s*\((\d{4})\)|^(.*?)\s*\((Season \d+)\)/)?.[0] ||
            $(element)?.find("a")?.attr("title")?.replace("Download", "") ||
            "",

          link: $(element)?.find("a")?.attr("href") || "",
          image:
            $(element).find("a").find("img").attr("data-lazy-src") ||
            $(element).find("a").find("img").attr("data-src") ||
            $(element).find("a").find("img").attr("src") ||
            "",
        };
        if (post.image.startsWith("//")) {
          post.image = "https:" + post.image;
        }
        posts.push(post);
      });

    // console.log(posts);
    return posts;
  } catch (error) {
    console.error("vegaGetPosts error:", error);
    return [];
  }
}
