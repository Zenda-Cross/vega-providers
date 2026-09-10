import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";

const providerValue = "gokuHD";

function normalizeLink(baseUrl: string, link: string): string {
  const url = new URL(link, `${baseUrl}/`);
  return `${url.pathname}${url.search}${url.hash}`;
}

function extractPosts($: any, baseUrl: string): Post[] {
  const posts: Post[] = [];
  $("article").each((_: number, element: any) => {
    const card = $(element);
    const anchor = card.find("h2.entry-title a, h2 a, a[href]").first();
    const href = anchor.attr("href") || "";
    const title = card
      .find("h2.entry-title, h2, h3")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const image =
      card.find("img").first().attr("data-lazy-src") ||
      card.find("img").first().attr("data-src") ||
      card.find("img").first().attr("src") ||
      "";
    if (!href || !title) return;
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
  const path =
    page > 1
      ? filter
        ? `/${filter}/page/${page}/`
        : `/page/${page}/`
      : filter
        ? `/${filter}/`
        : `/`;
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

  try {
    const today = new Date().toISOString().split("T")[0];
    const apiUrl = new URL(
      "https://search.pingora.fyi/collections/post/documents/search",
    );
    apiUrl.searchParams.append("q", searchQuery.trim());
    apiUrl.searchParams.append(
      "query_by",
      "post_title,category,stars,director,imdb_id",
    );
    apiUrl.searchParams.append("query_by_weights", "4,2,2,2,4");
    apiUrl.searchParams.append("sort_by", "sort_by_date:desc");
    apiUrl.searchParams.append("limit", "18");
    apiUrl.searchParams.append("highlight_fields", "none");
    apiUrl.searchParams.append("use_cache", "true");
    apiUrl.searchParams.append("page", String(page || 1));
    apiUrl.searchParams.append("analytics_tag", today);

    const response = await axios.get(apiUrl.href, {
      signal,
      headers: {
        ...commonHeaders,
        Referer: `${baseUrl}/search/`,
        Origin: baseUrl,
      },
    });

    if (response.data?.hits?.length) {
      return response.data.hits.map((hit: any) => {
        const doc = hit.document;
        return {
          title: doc.post_title,
          link: normalizeLink(baseUrl, doc.permalink),
          image: doc.post_thumbnail || "",
        };
      });
    }
  } catch {
    // Cloudflare or endpoint failure, fallback to site search
  }

  try {
    const searchUrl =
      page > 1
        ? new URL(`/page/${page}/`, `${baseUrl}/`).href
        : new URL(`/`, `${baseUrl}/`).href;

    const params = new URLSearchParams({
      s: searchQuery.trim(),
      post_type: "post",
    });

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
    if (error?.response?.status === 404 || error?.response?.status === 403) {
      return [];
    }
    throw error;
  }
};
