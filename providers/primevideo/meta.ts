import { Info, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

const BASE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/tv/home`,
};

async function getBypassCookie(axios: any): Promise<string> {
  try {
    const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
      headers: BASE_HEADERS,
    });
    const cookies = res.headers["set-cookie"];
    if (!cookies) return "";
    const all = Array.isArray(cookies) ? cookies.join(";") : cookies;
    const match = all.match(/t_hash_t=[^;]+/);
    return match ? match[0] : "";
  } catch {
    return "";
  }
}

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  const bypass = await getBypassCookie(axios);

  const headers = {
    ...BASE_HEADERS,
    Cookie: `ott=pv; hd=on; ${bypass}`,
  };

  const url = `${MAIN_URL}/pv/post.php?id=${link}&t=${unixTime}`;

  try {
    const res = await axios.get(url, { headers });
    const data = res.data;

    const isSeries =
      Array.isArray(data?.episodes) &&
      data.episodes.length &&
      data.episodes[0] !== null;

    const info: Info = {
      title: data.title,
      synopsis: data.desc,
      image: `https://imgcdn.kim/pv/v/${link}.jpg`,
      imdbId: "",
      type: isSeries ? "series" : "movie",
      linkList: [],
    };

    // 🎬 MOVIE
    if (!isSeries) {
      info.linkList.push({
        title: "▶ Play Movie",
        quality: "HD",
        episodesLink: "",
        directLinks: [{ title: "Server 1", link }],
      });
      return info;
    }

    // 📺 SERIES
    (data.season ?? []).forEach((s: any) => {
      info.linkList.push({
        title: `Season ${s.s.replace("S", "")}`,
        quality: "Default",
        episodesLink: `${link}|${s.id}`,
        directLinks: [],
      });
    });

    return info;
  } catch {
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
