import { ProviderContext } from "../types";

interface EpisodeLink {
  title: string;
  link: string;
}

const API_BASE = "https://9aniwatch-b.vercel.app/api/v2/hianime/anime";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;

  try {
    // --------------------------------------------------
    // 🔑 url = anime id OR season id
    // --------------------------------------------------
    const animeId = url.trim();
    if (!animeId) return [];

    // --------------------------------------------------
    // 🔗 API CALL
    // --------------------------------------------------
    const res = await axios.get(`${API_BASE}/${animeId}/episodes`);
    const data = res?.data?.data;

    if (!Array.isArray(data?.episodes)) return [];

    // --------------------------------------------------
    // 🎬 MAP EPISODES
    // Show only Episode Number
    // --------------------------------------------------
    const episodes: EpisodeLink[] = data.episodes.map((ep: any) => ({
      title: `Episode ${ep.number}`,
      link: `https://9aniwatch.to/watch/${ep.episodeId}`,
    }));

    return episodes;
  } catch (err: any) {
    console.log("episodes api error:", err?.message || err);
    return [];
  }
};
