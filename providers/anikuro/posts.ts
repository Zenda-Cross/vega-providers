import { Post, ProviderContext } from "../types";

const HOME_API = "https://9aniwatch-b.vercel.app/api/v2/hianime/home";
const SEARCH_API = "https://9aniwatch.to/api/search-filter";

// ------------------------------------------------------
// HOME POSTS
// ------------------------------------------------------
export async function getPosts({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchHomePosts(providerContext);
}

// ------------------------------------------------------
// SEARCH POSTS
// ------------------------------------------------------
export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;

  if (!searchQuery) return [];

  try {
    const res = await axios.get(SEARCH_API, {
      params: {
        q: searchQuery,
        page: 1,
      },
    });

    const animes = res?.data?.animes;
    if (!Array.isArray(animes)) return [];

    const posts: Post[] = [];

    for (const item of animes) {
      const info = item?.anime?.info;
      if (!info?.id) continue;

      posts.push({
        title: info.name,
        link: `https://9aniwatch.to/anime/${info.id}`,
        image: info.poster,
      });
    }

    return posts;
  } catch (err: any) {
    console.error("Search API error:", err?.message || err);
    return [];
  }
}

// ------------------------------------------------------
// FETCH HOME DATA
// ------------------------------------------------------
async function fetchHomePosts(
  providerContext: ProviderContext
): Promise<Post[]> {
  const { axios } = providerContext;

  try {
    const res = await axios.get(HOME_API);
    const data = res?.data?.data;
    if (!data) return [];

    const posts: Post[] = [];
    const seen = new Set<string>();

    const pushAnime = (anime: any) => {
      if (!anime?.id) return;

      const link = `https://9aniwatch.to/anime/${anime.id}`;
      if (seen.has(link)) return;

      seen.add(link);

      posts.push({
        title: anime.name,
        link,
        image: anime.poster,
      });
    };

    // 🆕 Latest Episodes
    if (Array.isArray(data.latestEpisodeAnimes)) {
      data.latestEpisodeAnimes.forEach(pushAnime);
    }

    // ❤️ Most Favorite (Top 10 Today)
    if (Array.isArray(data.top10Animes?.today)) {
      data.top10Animes.today.forEach(pushAnime);
    }

    return posts.slice(0, 100);
  } catch (err: any) {
    console.error("Home API error:", err?.message || err);
    return [];
  }
}
