import { Post, ProviderContext } from "../types";
import { API_BASE, commonHeaders, withKartoonsAuth } from "./headers";
import { throwProviderError } from "../providerErrors";

function formatPost(item: any): Post | null {
  if (!item || !item.title) return null;
  const isShow = item.type === "show" || item.seasons !== undefined;
  const ratingTag = item.rating ? `★ ${item.rating}` : undefined;
  const cornerTag =
    item.category ||
    (item.startYear ? String(item.startYear) : item.releaseYear ? String(item.releaseYear) : undefined);

  return {
    title: item.title,
    link: JSON.stringify({
      type: isShow ? "show" : "movie",
      id: item._id,
      slug: item.slug,
    }),
    image: item.image || item.coverImage || "",
    tag: ratingTag,
    cornerTag,
  };
}

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
    const { axios } = await withKartoonsAuth(providerContext, signal);
    const cleanFilter = filter || "/shows";

    // Handle non-paginated featured endpoints
    if (cleanFilter.includes("/featured")) {
      if (page > 1) return [];
      const res = await axios.get(`${API_BASE}${cleanFilter}`, {
        headers: commonHeaders,
        signal,
      });
      const items = res.data?.data || [];
      const posts: Post[] = [];
      for (const item of items) {
        const post = formatPost(item);
        if (post) posts.push(post);
      }
      return posts;
    }

    let url: string;
    if (cleanFilter.includes("page=")) {
      url = `${API_BASE}${cleanFilter}${page}&limit=20`;
    } else {
      const sep = cleanFilter.includes("?") ? "&" : "?";
      url = `${API_BASE}${cleanFilter}${sep}page=${page}&limit=20`;
    }

    const res = await axios.get(url, {
      headers: commonHeaders,
      signal,
    });

    const items = res.data?.data || res.data?.shows || res.data?.movies || [];
    const posts: Post[] = [];

    for (const item of items) {
      const post = formatPost(item);
      if (post) posts.push(post);
    }

    return posts;
  } catch (error) {
    throwProviderError("Kartoons", "getPosts", error);
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
    const { axios } = await withKartoonsAuth(providerContext, signal);
    const q = encodeURIComponent(searchQuery);

    const [showsRes, moviesRes] = await Promise.all([
      axios
        .get(`${API_BASE}/shows?search=${q}&page=${page}&limit=20`, {
          headers: commonHeaders,
          signal,
        }),
      axios
        .get(`${API_BASE}/movies?search=${q}&page=${page}&limit=20`, {
          headers: commonHeaders,
          signal,
        }),
    ]);

    const shows = showsRes.data?.data || [];
    const movies = moviesRes.data?.data || [];
    const combined = [...shows, ...movies];

    const posts: Post[] = [];
    for (const item of combined) {
      const post = formatPost(item);
      if (post) posts.push(post);
    }

    return posts;
  } catch (error) {
    throwProviderError("Kartoons", "getSearchPosts", error);
  }
};
