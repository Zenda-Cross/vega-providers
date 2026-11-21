import { Post, ProviderContext } from "../types";

const POSTERS_PLUS_OPTIONS =
  "shape=landscape&pc=stremio_tv_nuvio&tg=medium&bp=top_left&_is=1.05&_soo10=1&fti=1&mw=lb:.5,im:.5&tw=tk:.5,im:.5&amw=mal:.5,al:.5&atw=mal:.5,al:.5&fbs=photoreal&slr=1.20&shr=0.135&bdm=7&bms=5";

export const getPosts = async function ({
  filter,
  signal,
  providerValue,
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
      const rating = result?.imdbRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id) {
        catalog.push({
          title: title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image: image,
          ...(providerValue === "autoEmbed" && /^tt\d+$/.test(id) && (type === "movie" || type === "series")
            ? {homeImage: `https://postersplus.slokker.cc/poster?imdb_id=${id}&stremio_id=${id}&type=${type}&${POSTERS_PLUS_OPTIONS}`}
            : {}),
          tag,
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
  // providerValue,
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
    const url1 = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURI(
      searchQuery
    )}.json`;
    const url2 = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURI(
      searchQuery
    )}.json`;
    const res = await providerContext.axios.get(url1, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data = res.data;
    data?.metas.map((result: any) => {
      const title = result.name || "";
      const id = result?.imdb_id || result?.id;
      const image = result?.poster;
      const type = result?.type;
      const rating = result?.imdbRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id) {
        catalog.push({
          title: title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image: image,
          tag,
        });
      }
    });
    const res2 = await providerContext.axios.get(url2, {
      headers: providerContext.commonHeaders,
      signal,
    });
    const data2 = res2.data;
    data2?.metas.map((result: any) => {
      const title = result?.name || "";
      const id = result?.imdb_id || result?.id;
      const image = result?.poster;
      const type = result?.type;
      const rating = result?.imdbRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id) {
        catalog.push({
          title: title,
          link: `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
          image: image,
          tag,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("AutoEmbed error ", err);
    return [];
  }
};
