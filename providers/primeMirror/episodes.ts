import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url: link,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { getBaseUrl, axios } = providerContext;
  let providerValue = "netflixMirror";
  try {
    const baseUrl = await getBaseUrl("nfMirror");
    const url =
      `${baseUrl}${
        providerValue === "netflixMirror"
          ? "/episodes.php?s="
          : "/pv/episodes.php?s="
      }` +
      link +
      "&t=" +
      Math.round(new Date().getTime() / 1000);
    console.log("nfEpisodesUrl", url);
    let page = 1;
    let hasMorePages = true;
    const episodeList: EpisodeLink[] = [];
    while (hasMorePages) {
      const res = await axios.get(url + `&page=${page}`, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      const data = res.data;

      data?.episodes?.map((episode: any) => {
        episodeList.push({
          title: "Episode " + episode?.ep.replace("E", ""),
          link: episode?.id,
        });
      });
      if (data?.nextPageShow) {
        page++;
      } else {
        hasMorePages = false;
      }
    }

    return episodeList.sort((a, b) => {
      const aNum = parseInt(a.title.replace("Episode ", ""));
      const bNum = parseInt(b.title.replace("Episode ", ""));
      return aNum - bNum;
    });
  } catch (err) {
    console.error("nfGetEpisodes error", err);
    return [];
  }
};
