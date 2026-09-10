import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

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
  const { axios } = providerContext;
  const baseUrl = await getBaseUrl("kissKh");
  const url = `${baseUrl + filter}&type=0`;
  try {
    const res = await axios.get(url, { signal });
    const data = res.data?.data;
    const catalog: Post[] = [];
    data?.map((element: any) => {
      const title = element.title;
      const link = baseUrl + `/api/DramaList/Drama/${element?.id}?isq=false`;
      const image = element.thumbnail;
      const tag =
        element?.label?.trim() ||
        (element?.episodesCount ? `${element.episodesCount} Ep` : undefined);
      if (title && link && image) {
        catalog.push({
          title,
          link,
          image,
          aspectRatio: 16 / 9,
          ...(tag ? { tag } : {}),
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("kiss error ", err);
    return [];
  }
};

export const getSearchPosts = async function ({
  searchQuery,
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
  const baseUrl = await getBaseUrl("kissKh");
  const url = `${baseUrl}/api/DramaList/Search?q=${searchQuery}&type=0`;
  try {
    const res = await axios.get(url, { signal });
    const data = res.data;
    const catalog: Post[] = [];
    data?.map((element: any) => {
      const title = element.title;
      const link = baseUrl + `/api/DramaList/Drama/${element?.id}?isq=false`;
      const image = element.thumbnail;
      const tag =
        element?.label?.trim() ||
        (element?.episodesCount ? `${element.episodesCount} Ep` : undefined);
      if (title && link && image) {
        catalog.push({
          title,
          link,
          image,
          aspectRatio: 16 / 9,
          ...(tag ? { tag } : {}),
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("kiss error ", err);
    return [];
  }
};
