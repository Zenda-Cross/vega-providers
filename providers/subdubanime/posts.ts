import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
  page,
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
    const res = await axios.get("https://test.blakiteapi.xyz/api/getAllAnime.php");
    const catalogData = res.data?.data || {};
    const categoryItems = catalogData[filter] ? Object.values(catalogData[filter]) : [];
    
    // Paginate client-side
    const limit = 20;
    const start = (page - 1) * limit;
    const sliced = categoryItems.slice(start, start + limit);

    const postsList: Post[] = [];
    sliced.forEach((item: any) => {
      const title = item.title;
      const link = item.tmdbId || item.originalTmdbId;
      const image = item.IMAGES?.poster || item.IMAGES?.backdrop || "";
      if (title && link) {
        postsList.push({
          title,
          link,
          image,
        });
      }
    });
    return postsList;
  } catch (err) {
    console.error("Genga getPosts error:", err);
    return [];
  }
};

export const getSearchPosts = async function ({
  searchQuery,
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
    const res = await axios.get("https://test.blakiteapi.xyz/api/getAllAnime.php");
    const catalogData = res.data?.data || {};
    
    const query = searchQuery.toLowerCase();
    const postsList: Post[] = [];

    // Search through all categories
    for (const cat of ["movies", "series", "dramas"]) {
      const items = catalogData[cat] ? Object.values(catalogData[cat]) : [];
      items.forEach((item: any) => {
        const title = item.title || "";
        const genres = item.TMDB_DATA?.genres || [];
        const isMatch = title.toLowerCase().includes(query) || 
                        genres.some((g: string) => g.toLowerCase().includes(query));
        
        if (isMatch) {
          const link = item.tmdbId || item.originalTmdbId;
          const image = item.IMAGES?.poster || item.IMAGES?.backdrop || "";
          postsList.push({
            title,
            link,
            image,
          });
        }
      });
    }
    return postsList;
  } catch (err) {
    console.error("Genga getSearchPosts error:", err);
    return [];
  }
};
