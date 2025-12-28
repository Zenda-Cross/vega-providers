import { Post, ProviderContext } from "../types";

const BASE_URL = "https://coflix.si";
const API_URL = `${BASE_URL}/wp-json/apiflix/v1`;

export async function getPosts({
  filter = "movies",
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ type: filter, page, signal, providerContext });
}

export async function getSearchPosts({
  searchQuery,
  signal,
  providerContext,
}: {
  searchQuery: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;

  const url = `${BASE_URL}/suggest.php?query=${encodeURIComponent(
    searchQuery.trim()
  )}`;

  try {
    const res = await axios.get(url, { signal });
    const data = res.data || [];

    return data.map((item: any) => ({
      title: item.title,
      link: item.url.startsWith("http")
        ? item.url
        : new URL(item.url, BASE_URL).href,
      image: resolveImage(item.image),
    }));
  } catch {
    return [];
  }
}

async function fetchPosts({
  type,
  page,
  signal,
  providerContext,
}: {
  type: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;

  const url = `${API_URL}/options/?years=&post_type=${type}&genres=&page=${page}&sort=1`;

  try {
    const res = await axios.get(url, { signal });
    const results = res.data?.results || [];

    return results.map((item: any) => ({
      title: item.name,
      link: item.url.startsWith("http")
        ? item.url
        : new URL(item.url, BASE_URL).href,
      image: resolveImage(item.path),
    }));
  } catch {
    return [];
  }
}

/**
 * Kotlin equivalent of fetchImageUrl()
 */
function resolveImage(html?: string): string {
  if (!html) return "";

  const match = html.match(/src=["']([^"']+)["']/i);
  if (!match) return "";

  let src = match[1];
  if (src.startsWith("//")) src = "https:" + src;
  if (!src.startsWith("http")) src = new URL(src, BASE_URL).href;

  return src;
}
