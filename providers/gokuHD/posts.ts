import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";

const providerValue = "gokuHD";

function normalizeLink(baseUrl: string, link: string): string {
  const url = new URL(link, `${baseUrl}/`);
  return `${url.pathname}${url.search}${url.hash}`;
}

function extractPosts($: any, baseUrl: string): Post[] {
  const posts: Post[] = [];
  $("article.col_item").each((_: number, element: any) => {
    const card = $(element);
    const anchor = card.find("h2 a, h3 a, a[href]").first();
    const href = anchor.attr("href") || "";
    const title = card
      .find("h2, h3")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const image =
      card.find("img").first().attr("data-lazy-src") ||
      card.find("img").first().attr("data-src") ||
      card.find("img").first().attr("src") ||
      "";
    if (!href || !title || !image) return;
    posts.push({ title, link: normalizeLink(baseUrl, href), image });
  });
  return posts;
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
  const { axios, cheerio, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl(providerValue);
  const path = filter ? `/${filter}/page/${page}/` : `/page/${page}/`;
  const url = new URL(path, `${baseUrl}/`).href;

  const response = await axios.get(url, {
    signal,
    headers: {
      ...commonHeaders,
      Referer: `${baseUrl}/`,
    },
  });

  const $ = cheerio.load(response.data);
  return extractPosts($, baseUrl);
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
  if (!searchQuery.trim()) return [];
  const { axios, cheerio, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl(providerValue);

  const searchUrl =
    page > 1
      ? new URL(`/page/${page}/`, `${baseUrl}/`).href
      : new URL(`/`, `${baseUrl}/`).href;

  const params = new URLSearchParams({
    s: searchQuery.trim(),
    post_type: "post",
  });

  try {
    const response = await axios.post(searchUrl, params.toString(), {
      signal,
      headers: {
        ...commonHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${baseUrl}/`,
      },
    });

    const $ = cheerio.load(response.data);
    return extractPosts($, baseUrl);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
};
