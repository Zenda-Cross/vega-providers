import { ProviderContext } from "../types";

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

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}) {
  const { axios } = providerContext;
  const [seriesId, seasonId] = url.split("|");
  const unixTime = Math.floor(Date.now() / 1000);

  const bypass = await getBypassCookie(axios);
  if (!bypass) return [];

  const headers = {
    ...BASE_HEADERS,
    Cookie: `ott=pv; hd=on; ${bypass}`,
  };

  const episodes: any[] = [];
  let page = 1;

  while (true) {
    const api =
      `${MAIN_URL}/pv/episodes.php?s=${seasonId}` +
      `&series=${seriesId}&t=${unixTime}&page=${page}`;

    const res = await axios.get(api, { headers });
    const data = res.data;

    (data.episodes ?? []).forEach((ep: any) => {
      episodes.push({
        title: `E${ep.ep.replace("E", "")} - ${ep.t}`,
        link: ep.id,
        image: `https://imgcdn.kim/pvepimg/150/${ep.id}.jpg`,
      });
    });

    if (data.nextPageShow === 0) break;
    page++;
  }

  return episodes;
}
