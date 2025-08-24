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
      synopsis: data?.meta?.synopsis || "",
      image: data?.meta?.poster || "",
      imdbId: data?.meta?.imdb_id || "",
      type: data?.meta?.type || "movie",
      linkList: [],
    };

    const links: Link[] = [];
    const season = new Map<number, EpisodeLink[]>();

    if (meta.type === "series") {
      data?.meta?.videos?.forEach((video: any) => {
        if (!video?.season || video?.season <= 0) return;

        if (!season.has(video.season)) {
          season.set(video.season, []);
        }

        // Only include allowed EpisodeLink properties
        season.get(video.season)!.push({
          title: `Episode ${video.episode}`,
          link: JSON.stringify({
            title: meta.title,
            imdbId: meta.imdbId,
            season: video.id?.split(":")[1] || "",
            episode: video.id?.split(":")[2] || "",
            type: meta.type,
          }),
        });
      });

      Array.from(season.keys())
        .sort((a, b) => a - b)
        .forEach((key) => {
          links.push({
            title: `Season ${key}`,
            directLinks: season.get(key)!,
          });
        });
    } else {
      // Movie
      links.push({
        title: meta.title,
        directLinks: [
          {
            title: "Movie",
            link: JSON.stringify({
              title: meta.title,
              imdbId: meta.imdbId,
              season: "",
              episode: "",
              type: meta.type,
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

