import { Info, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const unix = Math.floor(Date.now() / 1000);

  try {
    const res = await axios.get(
      `${MAIN_URL}/mobile/hs/post.php?id=${link}&t=${unix}`,
      {
        headers: {
          Referer: `${MAIN_URL}/home`,
          Cookie: "ott=dp; hd=on;",
        },
      }
    );

    const data = res.data;

    const hasEpisodes =
      Array.isArray(data?.episodes) &&
      data.episodes.length > 0 &&
      data.episodes[0] !== null;

    const info: Info = {
      title: data.title || "",
      synopsis: data.desc || "",
      image: `https://imgcdn.kim/hs/v/${link}.jpg`,
      imdbId: "",
      type: hasEpisodes ? "series" : "movie",
      linkList: [],
    };

    if (!hasEpisodes) {
      info.linkList.push({
        title: "▶ Play Movie",
        quality: "HD",
        episodesLink: "",
        directLinks: [{ title: "Server 1", link: `${link}|${data.title}` }],
      });
      return info;
    }

    (data.season || []).forEach((s: any, i: number) => {
      info.linkList.push({
        title: `Season ${i + 1}`,
        quality: "Default",
        episodesLink: `${link}|${s.id}|${data.title}|series`,
        directLinks: [],
      });
    });

    return info;
  } catch (e) {
    console.error("Disney meta error:", e);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
}
