import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
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
    const url = "https://cinemeta-catalogs.strem.io" + filter;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data = res.data;
    data?.metas?.forEach((result: any) => {
      const title = result?.name;
      const id = result?.imdb_id || result?.id;
      const type = result?.type;
      const image =
        result?.background ||
        (id ? `https://images.metahub.space/background/medium/${id}/img` : "") ||
        result?.poster ||
        "";
      const rating = result?.imdbRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;

      if (id) {
        catalog.push({
          title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image,
          aspectRatio: 16 / 9,
          tag,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("Everything getPosts error:", err);
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
    const url1 = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(
      searchQuery,
    )}.json`;
    const url2 = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(
      searchQuery,
    )}.json`;

    const res = await providerContext.axios.get(url1, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data = res.data;
    data?.metas?.forEach((result: any) => {
      const title = result?.name || "";
      const id = result?.imdb_id || result?.id;
      const image =
        result?.background ||
        (id ? `https://images.metahub.space/background/medium/${id}/img` : "") ||
        result?.poster ||
        "";
      const type = result?.type;
      const rating = result?.imdbRating || result?.rating;
      const tag = rating ? `★ ${rating}` : undefined;

      if (id) {
        catalog.push({
          title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image,
          aspectRatio: 16 / 9,
          tag,
        });
      }
    });

    const res2 = await providerContext.axios.get(url2, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data2 = res2.data;
    data2?.metas?.forEach((result: any) => {
      const title = result?.name || "";
      const id = result?.imdb_id || result?.id;
      const image =
        data2?.background ||
        result?.background ||
        (id ? `https://images.metahub.space/background/medium/${id}/img` : "") ||
        result?.poster ||
        "";
      const type = result?.type;
      const rating = result?.imdbRating || result?.rating;
      const tag = rating ? `★ ${rating}` : undefined;

      if (id && !catalog.some((c) => c.link.includes(id))) {
        catalog.push({
          title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image,
          aspectRatio: 16 / 9,
          tag,
        });
      }
    });

    return catalog;
  } catch (err) {
    console.error("Everything getSearchPosts error:", err);
    return [];
  }
};
