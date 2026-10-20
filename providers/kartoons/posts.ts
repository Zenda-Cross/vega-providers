import { Post, ProviderContext } from "../types";
import { API_BASE, commonHeaders } from "./headers";

function formatPost(item: any): Post | null {
  if (!item || !item.title) return null;
  const isShow = item.type === "show" || item.seasons !== undefined;
  return {
    title: item.title,
    link: JSON.stringify({
      type: isShow ? "show" : "movie",
      id: item._id,
      slug: item.slug,
    }),
    image: item.image || item.coverImage || "",
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
    const { axios } = providerContext;
    const cleanFilter = filter || "/shows?page=";
    const delimiter = cleanFilter.includes("?") ? "&" : "?";
    const url = `${API_BASE}${cleanFilter}${page}${delimiter}limit=20`;

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
    const { axios } = providerContext;
    const q = encodeURIComponent(searchQuery);

    const [showsRes, moviesRes] = await Promise.all([
      axios
        .get(`${API_BASE}/shows?search=${q}&page=${page}&limit=20`, {
          headers: commonHeaders,
          signal,
        })
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(`${API_BASE}/movies?search=${q}&page=${page}&limit=20`, {
          headers: commonHeaders,
          signal,
        })
        .catch(() => ({ data: { data: [] } })),
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
    return [];
  }
};
