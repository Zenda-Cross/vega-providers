import { ProviderContext } from "../types";

export interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;

  // 🎬 MOVIE CASE → single Play button
  if (!url.includes("season=") || !url.includes("id=")) {
    return Promise.resolve([
      {
        title: "Play",
        link: url,
      },
    ]);
  }

  let season = "";
  let postId = "";

  try {
    const parsed = new URL(url);
    season = parsed.searchParams.get("season") || "";
    postId = parsed.searchParams.get("id") || "";
  } catch {
    return Promise.resolve([]); // ✅ FIX
  }

  if (!season || !postId) {
    return Promise.resolve([]); // ✅ FIX
  }

  const apiUrl =
    "https://coflix.si/wp-json/apiflix/v1/series/" +
    postId +
    "/" +
    season;

  return axios
    .get(apiUrl)
    .then((res: any) => {
      const episodes = res.data?.episodes || [];

      return episodes.map((ep: any) => ({
        title: ep.title || "Episode " + ep.number,
        link: ep.links,
      }));
    })
    .catch((err: any) => {
      console.error("Coflix episodes error:", err?.message || err);
      return []; // ✅ already inside Promise
    });
};
