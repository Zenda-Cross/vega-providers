import { Post, ProviderContext } from "../types";

const POSTS_API = "https://a111477.1proxy.workers.dev/";

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
  const response = await providerContext.axios.get(POSTS_API, {
    params: { filter, page, limit: 50 },
    signal,
  });
  return response.data?.posts || [];
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
  const response = await providerContext.axios.get(POSTS_API, {
    params: { q: searchQuery, page, limit: 50 },
    signal,
  });
  return response.data?.posts || [];
};
