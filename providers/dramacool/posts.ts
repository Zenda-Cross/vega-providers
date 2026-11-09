import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

const DEFAULT_BASE_URL = "https://asianc.id";

async function resolveBaseUrl(
  providerContext?: ProviderContext
): Promise<string> {
  try {
    if (
      providerContext &&
      typeof (providerContext as any).getBaseUrl === "function"
    ) {
      const resolved =
        (await (providerContext as any).getBaseUrl("dramacool")) ||
        (await (providerContext as any).getBaseUrl("asianc"));
      if (resolved) {
        return resolved.replace(/\/+$/, "");
      }
    }
  } catch {}
  try {
    const resolved =
      (await getBaseUrl("dramacool")) || (await getBaseUrl("asianc"));
    if (resolved) {
      return resolved.replace(/\/+$/, "");
    }
  } catch {}
  return DEFAULT_BASE_URL;
}

function parseItems(
  html: string,
  cheerio: ProviderContext["cheerio"],
  baseUrl: string
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  $("ul.list-episode-item li, ul.list-movie li, ul.list-star li").each(
    (_, element) => {
      const $el = $(element);
      const a = $el.find("a").first();
      const href = a.attr("href") || "";
      const title =
        $el.find("h3, .title").text().trim() || a.attr("title")?.trim() || "";
      const rawImg =
        $el.find("img").attr("data-original") ||
        $el.find("img").attr("src") ||
        "";
      const tag = $el.find(".ep, .type").first().text().trim();

      if (title && href) {
        const link = href.startsWith("http")
          ? href
          : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
        const image = rawImg.startsWith("http")
          ? rawImg
          : rawImg
          ? `${baseUrl}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`
          : "";

        posts.push({
          title,
          link,
          image,
          aspectRatio: 2 / 3,
          ...(tag ? { tag } : {}),
        });
      }
    }
  );

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
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const baseUrl = await resolveBaseUrl(providerContext);
    const cleanFilter = filter || "/recently-added";
    const pageParam =
      page > 1
        ? cleanFilter.includes("?")
          ? `&page=${page}`
          : `?page=${page}`
        : "";
    const url = `${baseUrl}${cleanFilter.startsWith("/") ? "" : "/"}${cleanFilter}${pageParam}`;

    const res = await axios.get(url, {
      headers: {
        ...(commonHeaders || {}),
        Referer: `${baseUrl}/`,
      },
      signal,
    });

    return parseItems(res.data, cheerio, baseUrl);
  } catch (err) {
    console.error("dramacool getPosts error:", err);
    return [];
  }
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
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const baseUrl = await resolveBaseUrl(providerContext);
    const pageParam = page > 1 ? `&page=${page}` : "";
    const url = `${baseUrl}/search?type=drama&keyword=${encodeURIComponent(
      searchQuery
    )}${pageParam}`;

    const res = await axios.get(url, {
      headers: {
        ...(commonHeaders || {}),
        Referer: `${baseUrl}/`,
      },
      signal,
    });

    return parseItems(res.data, cheerio, baseUrl);
  } catch (err) {
    console.error("dramacool getSearchPosts error:", err);
    return [];
  }
};
