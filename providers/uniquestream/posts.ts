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
  const { axios, commonHeaders } = providerContext;
  const baseUrl = "https://anime.uniquestream.net";
  const url = `${baseUrl}/api/v1/videos/${filter}?page=${page}&limit=20&type=all`;

  try {
    const res = await axios.get(url, { headers: commonHeaders, signal });
    // The API might return an array directly or wrap it in a data object
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    
    return data.map((item: any) => ({
      title: item.title,
      link: `https://anime.uniquestream.net/api/v1/series/${item.content_id}`,
      image: item.images?.[0]?.url || "",
    }));
  } catch (error) {
    console.error("uniquestream getPosts failed", error);
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
  if (page > 1) {
    return [];
  }
  const { axios, commonHeaders } = providerContext;
  const baseUrl = "https://anime.uniquestream.net";
  const url = `${baseUrl}/api/v1/search?q=${encodeURIComponent(searchQuery)}`;

  try {
    const res = await axios.get(url, { headers: commonHeaders, signal });
    const series = res.data?.series || [];
    const movies = res.data?.movies || [];
    
    const combined = [...series, ...movies];
    
    return combined.map((item: any) => ({
      title: item.title,
      link: `https://anime.uniquestream.net/api/v1/series/${item.content_id}`,
      image: item.images?.[0]?.url || "",
    }));
  } catch (error) {
    console.error("uniquestream getSearchPosts failed", error);
    return [];
  }
};
