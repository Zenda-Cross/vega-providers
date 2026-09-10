import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios } = providerContext;
    const res = await axios.get(link);
    const data = res.data;
    const isMovie = !data.episodesCount || data.episodesCount <= 1;
    const mediaType = isMovie ? "movie" : "series";
    const meta = {
      title: data.title,
      synopsis: data.description,
      image: data.thumbnail,
      tags: [data?.releaseDate?.split("-")[0], data?.status, data?.type],
      imdbId: "",
      type: mediaType,
    };

    const linkList: Link[] = [];
    const subLinks: Link["directLinks"] = [];

    const episodes = Array.isArray(data?.episodes)
      ? data.episodes.slice().reverse()
      : [];

    episodes.forEach((episode: any) => {
      const title = isMovie ? "Full Movie" : "Episode " + episode?.number;
      const link = episode?.id?.toString();
      if (link && title) {
        subLinks.push({
          title,
          link,
          type: mediaType,
        });
      }
    });

    linkList.push({
      title: isMovie ? "Movie" : meta.title,
      directLinks: subLinks,
    });

    return {
      ...meta,
      linkList: linkList,
    };
  } catch (err) {
    console.error("kisskh getMeta error:", err);
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
