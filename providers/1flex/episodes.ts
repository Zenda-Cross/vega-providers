import { EpisodeLink, ProviderContext } from "../types";

const DB_BASE = "https://db.1flex.org";

function parseEpisodeUrl(url: string): { id: string; season: number } {
  try {
    if (url.startsWith("{")) {
      const parsed = JSON.parse(url);
      return { id: String(parsed.id), season: Number(parsed.season) || 1 };
    }
    const u = new URL(url);
    const id = u.searchParams.get("id") || "";
    const season = Number(u.searchParams.get("season")) || 1;
    return { id, season };
  } catch {
    const idMatch = url.match(/id=([^&]+)/);
    const seasonMatch = url.match(/season=([^&]+)/);
    return {
      id: idMatch ? idMatch[1] : url,
      season: seasonMatch ? Number(seasonMatch[1]) : 1,
    };
  }
}

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;
  const { id, season } = parseEpisodeUrl(url);

  const endpoint = `${DB_BASE}/tv/${id}/season/${season}`;
  const response = await axios.get(endpoint, {
    headers: {
      ...providerContext.commonHeaders,
      Referer: "https://www.1flex.org/",
      Origin: "https://www.1flex.org",
    },
  });

  const episodes: any[] = response.data?.episodes || [];
  return episodes.map((ep) => ({
    title: `Episode ${ep.episode_number}: ${ep.name || ""}`.trim(),
    link: JSON.stringify({
      id,
      season,
      episode: ep.episode_number,
      type: "tv",
    }),
    description: ep.overview || undefined,
    image: ep.still_path
      ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
      : undefined,
  }));
};
