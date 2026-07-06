import { EpisodeLink, ProviderContext } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

let cachedUserId: string | null = null;

const getUserId = () => {
  if (!cachedUserId) {
    cachedUserId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return cachedUserId;
};


export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios } = providerContext;
    const seasonId = url.split("*")[0];

    const endpoint = `https://api.mxplayer.in/v1/web/detail/tab/tvshowepisodes?type=season&id=${seasonId}&sortOrder=0&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.mxplayer.in/",
      "Origin": "https://www.mxplayer.in",
    };

    const res = await axios.get(endpoint, { headers });
    const payload = res.data?.data || res.data || {};
    const items = payload.items || payload || [];

    const episodes: EpisodeLink[] = [];
    items.forEach((item: any) => {
      const epNo = item.episodeNo || item.episode_number || item.sequence || "";
      const title = `Episode ${epNo} - ${item.title || ""}`;
      episodes.push({
        title,
        link: `${item.id}*episode`,
      });
    });

    return episodes;
  } catch (err) {
    console.error("MXPlayer getEpisodes error:", err);
    return [];
  }
};
