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
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("drive");
  const url = `${baseUrl + filter}page/${page}/`;
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
  const baseUrl = await getBaseUrl("drive");
  const url = buildSearchUrl(baseUrl, searchQuery, page);
  return searchPosts({
    url,
    baseUrl,
    signal,
  });
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
  try {
    console.log("Fetching URL:", url);
    const { cheerio } = providerContext;
    const res = await fetch(url, { signal });
    const data = await res.text();
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".poster-card").map((i, element) => {
      const title = $(element).find(".poster-title").text();
      const link = $(element).parent().attr("href");
      const image = $(element).find(".poster-image img").attr("src");
      if (title && link && image) {
        catalog.push({
          title: title.replace("Download", "").trim(),
          link: toRelativePath(baseUrl, link),
          image: image,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("drive error ", err);
    return [];
  }
}

async function searchPosts({
  url,
  baseUrl,
  signal,
}: {
  url: string;
  baseUrl: string;
  signal: AbortSignal;
}): Promise<Post[]> {
  try {
    console.log("Fetching drive search URL:", url);
    const res = await fetch(url, { signal });

    if (!res.ok) {
      throw new Error(`drive search failed with status ${res.status}`);
    }

    const data = (await res.json()) as {
      hits?: Array<{
        document?: {
          permalink?: string;
          post_thumbnail?: string;
          post_title?: string;
        };
      }>;
    };

    return (
      data.hits
        ?.map((hit) => {
          const document = hit.document;
          const title = document?.post_title?.trim();
          const link = document?.permalink
            ? toRelativePath(baseUrl, document.permalink)
            : "";
          const image = document?.post_thumbnail
            ? normalizeUrl(baseUrl, document.post_thumbnail)
            : "";

          if (!title || !link || !image) {
            return null;
          }

          return {
            title,
            link,
            image,
          };
        })
        .filter((post): post is Post => post !== null) ?? []
    );
  } catch (err) {
    console.error("drive search error ", err);
    return [];
  }
}

function buildSearchUrl(
  baseUrl: string,
  searchQuery: string,
  page: number,
): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${trimTrailingSlash(baseUrl)}/search.php${separator}q=${encodeURIComponent(
    searchQuery,
  )}&page=${page}`;
}

function normalizeUrl(baseUrl: string, value: string): string {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${trimTrailingSlash(baseUrl)}${value}`;
  }

  return `${trimTrailingSlash(baseUrl)}/${trimLeadingSlash(value)}`;
}

function toRelativePath(baseUrl: string, value: string): string {
  const absoluteUrl = normalizeUrl(baseUrl, value);
  const postUrl = new URL(absoluteUrl);

  return `${postUrl.pathname}${postUrl.search}${postUrl.hash}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}
