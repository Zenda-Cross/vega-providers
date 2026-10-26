import { Post, ProviderContext } from "../types";
import {
  buildSearchUrl,
  firstValue,
  getLicenseFilter,
  imageUrl,
  sanitizeQuery,
} from "./api";

const searchItems = async (
  query: string,
  page: number,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<Post[]> => {
  const license = await getLicenseFilter(providerContext);
  const url = buildSearchUrl(`(${query}) AND mediatype:movies AND ${license}`, page);
  const res = await providerContext.axios.get(url, {
    headers: providerContext.commonHeaders,
    signal,
  });
  const docs: any[] = res.data?.response?.docs || [];
  return docs
    .filter((doc) => doc.identifier)
    .map((doc) => {
      const title = firstValue(doc.title) || doc.identifier;
      const year = firstValue(doc.year);
      return {
        title,
        link: doc.identifier,
        image: imageUrl(doc.identifier),
        cornerTag: year || undefined,
      };
    });
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
  const words = sanitizeQuery(searchQuery);
  if (!words) return [];
  return searchItems(`title:(${words})`, page, providerContext, signal);
};
