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
    console.log("all", link);
    const res = await axios.get(link);
    const data = res.data;
    const meta = {
      title: data?.meta?.name || "",
      synopsis: data?.meta?.description || "",
      image: data?.meta?.background || "",
      imdbId: data?.meta?.imdb_id || "",
      type: data?.meta?.type || "movie",
    };

    const links: Link[] = [];
    let directLinks: EpisodeLink[] = [];
    let season = new Map();
    if (meta.type === "series") {
      data?.meta?.videos?.map((video: any) => {
        if (video?.season <= 0) return;
        if (!season.has(video?.season)) {
          season.set(video?.season, []);
        }
        season.get(video?.season).push({
          title: "Episode " + video?.episode,
          type: "series",
          link: `${data?.meta?.imdb_id}-${video?.id?.split(":")[1]}-${
            video?.id?.split(":")[2]
          }`,
        });
      });
      const keys = Array.from(season.keys());
      keys.sort();
      keys.map((key) => {
        directLinks = season.get(key);
        links.push({
          title: `Season ${key}`,
          directLinks: directLinks,
        });
      });
    } else {
      links.push({
        title: data?.meta?.name as string,
        directLinks: [
          {
            title: "Movie",
            type: "movie",
            link: `${data?.meta?.imdb_id}-`,
          },
        ],
      });
    }
    return {
      ...meta,
      linkList: links,
    };
  } catch (err) {
    console.error(err);
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
