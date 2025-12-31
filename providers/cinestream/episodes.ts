import { ProviderContext } from "../types";

export interface EpisodeLink {
  title: string;
  link: string;
}

const CINEMETA = "https://v3-cinemeta.strem.io";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;

  try {
    const parsed = new URL(url);

    // 🔹 imdb id extract
    let imdbId =
      parsed.pathname.replace("/", "") ||
      parsed.hostname ||
      "";

    if (!imdbId.startsWith("tt")) return [];

    const season = parsed.searchParams.get("season") || "1";

    // 🔹 try series meta first
    const seriesRes = await axios.get(
      `${CINEMETA}/meta/series/${imdbId}.json`,
      { validateStatus: () => true }
    );

    const videos = seriesRes.data?.meta?.videos;

    // ============================
    // 🎬 MOVIE → Play button
    // ============================
    if (!Array.isArray(videos) || videos.length === 0) {
      return [
        {
          title: "Play",
          link: url,
        },
      ];
    }

    // ============================
    // 📺 SERIES → Episodes list
    // ============================
    return videos
      .filter((ep: any) => String(ep.season) === String(season))
      .map((ep: any) => ({
        title: `Episode ${ep.episode}`,
        link: `cinestream://${imdbId}?season=${ep.season}&episode=${ep.episode}`,
      }));
  } catch (err: any) {
    console.error("CineStream episodes error:", err?.message || err);
    return [];
  }
};
