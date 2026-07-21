import { Post, ProviderContext } from "../types";

const hdbHeaders = {
  Cookie: "xla=s4t",
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("hdhub");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({ baseUrl, url, signal, providerContext });
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
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("hdhub");
  try {
    const today = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({
      q: searchQuery,
      query_by: "post_title,category,stars,director,imdb_id",
      query_by_weights: "4,2,2,2,4",
      sort_by: "sort_by_date:desc",
      limit: "15",
      highlight_fields: "none",
      use_cache: "true",
      page: String(page),
      analytics_tag: today,
    });
    const searchUrl = `https://search.pingora.fyi/collections/post/documents/search?${params.toString()}`;
    const res = await fetch(searchUrl, {
      headers: {
        ...hdbHeaders,
        Referer: baseUrl + "/",
        Accept: "application/json, text/plain, */*",
      },
      signal,
    });
    const json: any = await res.json();
    const hits: any[] = Array.isArray(json?.hits) ? json.hits : [];
    const catalog: Post[] = [];
    for (const hit of hits) {
      const doc = hit?.document || {};
      const title = String(doc.post_title || "")
        .replace(/Download/gi, "")
        .trim();
      const permalink = String(doc.permalink || "");
      const image = String(doc.post_thumbnail || "");
      if (!title || !permalink) continue;
      const postUrl = new URL(permalink, `${baseUrl}/`);
      const link = `${postUrl.pathname}${postUrl.search}${postUrl.hash}`;
      catalog.push({ title, link, image });
    }
    return catalog;
  } catch (err) {
    console.error("hdhubGetSearchPosts error ", err);
    return [];
  }
};

async function posts({
  baseUrl,
  url,
  signal,
  providerContext,
}: {
  baseUrl: string;
  url: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { cheerio } = providerContext;
  try {
    const res = await fetch(url, {
      headers: hdbHeaders,
      signal,
    });
    const data = await res.text();
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".recent-movies")
      .children()
      .map((i, element) => {
        const title = $(element).find("figure").find("img").attr("alt");
        const link = $(element).find("a").attr("href");
        const image = $(element).find("figure").find("img").attr("src");

        if (title && link && image) {
          const postUrl = new URL(link, `${baseUrl}/`);
          catalog.push({
            title: title.replace("Download", "").trim(),
            link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    console.error("hdhubGetPosts error ", err);
    return [];
  }
}
