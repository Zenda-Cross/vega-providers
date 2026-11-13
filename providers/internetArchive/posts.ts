import { Post, ProviderContext } from "../types";
import {
  buildSearchQuery,
  buildSearchUrl,
  firstValue,
  getLicenseFilter,
  getSortOrder,
  getWithRetry,
  imageUrl,
} from "./api";

const searchItems = async (
  query: string,
  page: number,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<Post[]> => {
  const [license, sort] = await Promise.all([
    getLicenseFilter(providerContext),
    getSortOrder(providerContext),
  ]);
  const url = buildSearchUrl(`(${query}) AND mediatype:movies AND ${license}`, page, 24, sort);
  const res = await getWithRetry(url, providerContext, signal);
  const docs: any[] = res.data?.response?.docs || [];
  const seen = new Set<string>();
  const posts: Post[] = [];
  for (const doc of docs) {
    if (!doc.identifier || seen.has(doc.identifier)) continue;
    seen.add(doc.identifier);
    const year = firstValue(doc.year);
    posts.push({
      title: firstValue(doc.title) || doc.identifier,
      link: doc.identifier,
      image: imageUrl(doc.identifier),
      cornerTag: year || undefined,
    });
  }
  return posts;
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
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return searchItems(filter, page, providerContext, signal);
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
  const query = buildSearchQuery(searchQuery);
  if (!query) return [];
  return searchItems(query, page, providerContext, signal);
};
