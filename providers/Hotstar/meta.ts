import { Info, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";
const API_BASE = `${MAIN_URL}/mobile/hs`;

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36";

const USER_TOKEN = "233123f803cf02184bf6c67e149cdd50";

const BASE_HEADERS = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/home`,
  Cookie: `ott=hs; hd=on; user_token=${USER_TOKEN};`,
};

/**
 * 🔐 BYPASS → get t_hash_t
 * SAME AS KOTLIN bypass(mainUrl)
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
      headers: BASE_HEADERS,
    });

    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const raw = Array.isArray(setCookie)
        ? setCookie.join(";")
        : setCookie;

      const match = raw.match(/t_hash_t=[^;]+/);
      if (match) return match[0];
    }
  } catch (e) {
    console.error("HS bypass error:", e);
  }
  return "";
}

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const id = link;
  const unixTime = Math.floor(Date.now() / 1000);

  const tHash = await getBypassCookie(axios);

  const headers = {
    ...BASE_HEADERS,
    Cookie: `${BASE_HEADERS.Cookie} ${tHash}`,
  };

  try {
    /**
     * 🎯 POST DATA (Kotlin equivalent)
     */
    const res = await axios.get(
      `${API_BASE}/post.php?id=${id}&t=${unixTime}`,
      { headers }
    );

    const data = res.data;

    const title = data?.title || "";
    const desc = data?.desc || "";
    const image = `https://imgcdn.kim/hs/v/${id}.jpg`;

    const hasEpisodes =
      Array.isArray(data?.episodes) &&
      data.episodes.length > 0 &&
      data.episodes[0] !== null;

    const info: Info = {
      title,
      synopsis: desc,
      image,
      imdbId: "",
      type: hasEpisodes ? "series" : "movie",
      linkList: [],
    };

    /**
     * 🎬 MOVIE → DIRECT PLAY
     */
    if (!hasEpisodes) {
      info.linkList.push({
        title: "▶ Play Movie",
        quality: "HD",
        episodesLink: "",
        directLinks: [
          {
            title: "Default Server",
            link: `${id}|${title}`,
          },
        ],
      });
      return info;
    }

    /**
     * 📺 SERIES → SEASONS
     * 🔥 FIX: Season text uses INDEX, not seasonId
     */
    const seasons = Array.isArray(data?.season) ? data.season : [];

    seasons.forEach((s: any, index: number) => {
      const seasonId = s?.id ?? `${index + 1}`;
      const seasonNumber = index + 1; // ✅ UI SAFE

      info.linkList.push({
        title: `Season ${seasonNumber}`, // ✅ CLEAN UI
        quality: "Default",

        // 🔑 backend uses real seasonId
        episodesLink: `${id}|${seasonId}|${title}|series`,
        directLinks: [],
      });
    });

    return info;
  } catch (e) {
    console.error("Hotstar meta error:", e);
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
