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
  try {
    const catalog: Post[] = [];
    const skipParam = page > 1 ? `&skip=${(page - 1) * 20}` : "";
    const filterWithSkip = filter.replace(".json", `${skipParam}.json`);
    const baseUrl = filter.startsWith("http")
      ? ""
      : "https://anime-kitsu.strem.fun";
    const url = baseUrl + filterWithSkip;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data = res.data;
    data?.metas?.forEach((result: any) => {
      const title = result?.name;
      const id = result?.id;
      const image = result?.poster;
      const rating = result?.kitsuRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id) {
        catalog.push({
          title,
          link: `https://anime-kitsu.strem.fun/meta/anime/${id}.json`,
          image,
          tag,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("AnimeSub getPosts error", err);
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
    if (page > 1) {
      return [];
    }
    const catalog: Post[] = [];
    const encoded = encodeURIComponent(searchQuery);
    const url = `https://anime-kitsu.strem.fun/catalog/anime/kitsu-anime-list/search=${encoded}.json`;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data = res.data;
    data?.metas?.forEach((result: any) => {
      const title = result?.name || "";
      const id = result?.id;
      const image = result?.poster;
      const rating = result?.kitsuRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id && !catalog.some((item) => item.link.includes(id))) {
        catalog.push({
          title,
          link: `https://anime-kitsu.strem.fun/meta/anime/${id}.json`,
          image,
          tag,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("AnimeSub getSearchPosts error", err);
    return [];
  }
};
