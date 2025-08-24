import { EpisodeLink, Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const axios = providerContext.axios;

  try {
    const res = await axios.get(link);
    const data = res.data;

    const meta: Info = {
      title: data?.meta?.name || "",
      synopsis: data?.meta?.overview || "",
      image: data?.meta?.poster_path || "",
      imdbId: data?.meta?.imdb_id || "",
      type: data?.meta?.type || "movie",
      linkList: [],
    };

    const links: Link[] = [];

    if (meta.type === "series") {
      const seasonMap = new Map<number, EpisodeLink[]>();

      data?.meta?.videos?.forEach((video: any) => {
        if (video?.season <= 0) return;

        if (!seasonMap.has(video.season)) seasonMap.set(video.season, []);

        const episodeData = {
          title: "Episode " + video.episode,
          type: "series",
          link: JSON.stringify({
            title: data.meta.name,
            imdbId: data.meta.imdb_id,
            season: video.season,
            episode: video.episode,
            type: "series",
            stream: video?.stream_url || "", // ✅ Stream URL
            download: video?.download_url || "", // ✅ Download URL
            year: data.meta.year,
          }),
        };

        seasonMap.get(video.season)?.push(episodeData);
      });

      Array.from(seasonMap.keys())
        .sort((a, b) => a - b)
        .forEach((seasonNum) => {
          links.push({
            title: `Season ${seasonNum}`,
            directLinks: seasonMap.get(seasonNum) || [],
          });
        });
    } else {
      // Movie
      links.push({
        title: meta.title,
        directLinks: [
          {
            title: "Play",
            type: "movie",
            link: JSON.stringify({
              title: meta.title,
              imdbId: meta.imdbId,
              type: "movie",
              stream: data?.meta?.stream_url || "", // ✅ Stream URL
              download: data?.meta?.download_url || "", // ✅ Download URL
              year: data?.meta?.year,
            }),
          },
          {
            title: "Download",
            type: "movie",
            link: JSON.stringify({
              title: meta.title,
              imdbId: meta.imdbId,
              type: "movie",
              stream: data?.meta?.stream_url || "",
              download: data?.meta?.download_url || "",
              year: data?.meta?.year,
            }),
          },
        ],
      });
    }

    meta.linkList = links;
    return meta;
  } catch (err) {
    console.error("getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};

