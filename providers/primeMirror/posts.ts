import { Post, ProviderContext } from "../types";
import { netMirrorGetPosts, netMirrorSearch } from "../netMirrorCommon";

export const getPosts = async function ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return netMirrorGetPosts({
    filter,
    page,
    prefix: "pv",
    providerValue,
    signal,
    providerContext,
  });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return netMirrorSearch({
    searchQuery,
    page,
    prefix: "pv",
    providerValue,
    signal,
    providerContext,
  });
};
