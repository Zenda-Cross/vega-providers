import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, commonHeaders } = providerContext;

  try {
    let allEpisodes: any[] = [];
    let page = 1;
    let hasMore = true;

    // The API might limit results (e.g. 20 per page). We fetch until we get an empty array.
    while (hasMore) {
      // url includes page=1 already, but we need to replace it with current page
      // also replace limit to 20
      const pageUrl = url.replace(/page=\d+/, `page=${page}`).replace(/limit=\d+/, `limit=20`);
      
      const res = await axios.get(pageUrl, { headers: commonHeaders });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      if (data.length > 0) {
        allEpisodes = allEpisodes.concat(data);
        page++;
        // If we got exactly the limit, there MIGHT be more. If less, we are done.
        if (data.length < 20) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allEpisodes.map((item: any) => ({
      title: item.title || `Episode ${item.episode_number}`,
      link: `https://anime.uniquestream.net/api/v1/episode/${item.content_id}/media/dash/ja-JP`,
    }));
  } catch (error) {
    console.error("uniquestream getEpisodes failed", error);
    return [];
  }
};
