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
    console.log("allGetPostUrl", url);
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data = res.data;
    data?.metas.map((result: any) => {
      const title = result?.name;
      const id = result?.imdb_id || result?.id;
      const type = result?.type;
      const image = result?.poster;
      if (id) {
        catalog.push({
          title: title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image: image,
        });
      }
    });
    console.log("catalog", catalog.length);
    return catalog;
  } catch (err) {
    console.error("AutoEmbed error ", err);
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
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  try {
    const { axios, commonHeaders: headers } = providerContext;
    if (page > 1) {
      return [];
    }
    const catalog: Post[] = [];
    const url2 = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURI(
      searchQuery
    )}.json`;
    const res2 = await axios.get(url2, { headers, signal });
    const data2 = res2.data;
    data2?.metas.map((result: any) => {
      const title = result?.name || "";
      const id = result?.imdb_id || result?.id;
      const image = result?.poster;
      const type = result?.type;
      if (id) {
        catalog.push({
          title: title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image: image,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("AutoEmbed error ", err);
    return [];
  }
};
