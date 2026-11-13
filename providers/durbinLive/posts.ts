import { Post, ProviderContext } from "../types";
import { absolute, getBase, getPage, parsePosts } from "./api";
import { throwProviderError } from "../providerErrors";

export async function getPosts({ filter, page = 1, signal, providerContext }: {
  filter: string; page: number; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const base = await getBase(providerContext);
    const url = new URL(absolute(filter || "/sports", base));
    url.searchParams.set("page", String(page));
    const html = await getPage(url.href, providerContext, `${base}/`, signal);
    // The site repeats its last page for out-of-range requests.
    const $ = providerContext.cheerio.load(html);
    const active = Number($(".pagination a.active").first().text().trim());
    if (page > 1 && active && active !== page) return [];
    return parsePosts(html, providerContext, base);
  } catch (error) {
    throwProviderError("DurbinLive", "posts", error);
  }
}

export async function getSearchPosts({ searchQuery, page = 1, signal, providerContext }: {
  searchQuery: string; page: number; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  if (page > 1 || searchQuery.trim().length < 2) return [];
  try {
    const base = await getBase(providerContext);
    const url = new URL("/search_elastic", base);
    url.searchParams.set("s", searchQuery.trim());
    return parsePosts(await getPage(url.href, providerContext, `${base}/`, signal), providerContext, base);
  } catch (error) {
    throwProviderError("DurbinLive", "search", error);
  }
}
