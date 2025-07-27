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
  const { axios } = providerContext;
  const baseUrl = "https://backend.animetsu.to";

  // Parse filter to modify page parameter
  const url = baseUrl + filter + "&page=" + page.toString();
  console.log("animetsuGetPosts url", url);

  return posts({ url: url.toString(), signal, axios });
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
  const { axios } = providerContext;
  const baseUrl = "https://backend.animetsu.to";
  const url = `${baseUrl}/api/anime/search?query=${encodeURIComponent(
    searchQuery
  )}&page=${page}&perPage=35&year=any&sort=favourites&season=any&format=any&status=any`;

  return posts({ url, signal, axios });
};

async function posts({
  url,
  signal,
  axios,
}: {
  url: string;
  signal: AbortSignal;
  axios: ProviderContext["axios"];
}): Promise<Post[]> {
  try {
    const res = await axios.get(url, {
      signal,
      headers: {
        Referer: "https://animetsu.to/",
      },
    });
    const data = res.data?.results;
    const catalog: Post[] = [];

    data?.map((element: any) => {
      const title =
        element.title?.english ||
        element.title?.romaji ||
        element.title?.native;
      const link = element.id?.toString();
      const image =
        element.coverImage?.large ||
        element.coverImage?.extraLarge ||
        element.coverImage?.medium;

      if (title && link && image) {
        catalog.push({
          title: title,
          link: link,
          image: image,
        });
      }
    });

    return catalog;
  } catch (err) {
    console.error("animetsu error ", err);
    return [];
  }
}
