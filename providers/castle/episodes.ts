import { EpisodeLink, ProviderContext } from "../types";
import { apiMovieDetails, parseSeasonLink, pickDetails, playLink } from "./castleCore";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const movieId = parseSeasonLink(url);
    if (!movieId) return [];

    const env      = await apiMovieDetails(movieId, providerContext);
    const details  = pickDetails(env);
    const episodes: any[] = Array.isArray(details.episodes) ? details.episodes : [];
    if (!episodes.length) return [];

    const ownerId = String(details.id ?? movieId);
    const out: EpisodeLink[] = [];

    episodes.forEach((ep: any, i: number) => {
      if (!ep?.id) return;
      const num  = ep.number ?? (i + 1);
      const name = ep.title || `Episode ${num}`;
      out.push({
        title: `${num}. ${name}`,
        link:  playLink(ownerId, ep.id),
      });
    });

    return out;
  } catch (err) {
    console.error("CastleTV getEpisodes error:", err);
    return [];
  }
};
