import { ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<{ title: string; link: string; image?: string }[]> {
  const { axios } = providerContext;
  const unix = Math.floor(Date.now() / 1000);

  const [seriesId, seasonId, title] = url.split("|");
  const episodes: any[] = [];
  let page = 1;

  while (true) {
    const api =
      `${MAIN_URL}/mobile/hs/episodes.php?s=${seasonId}` +
      `&series=${seriesId}&t=${unix}&page=${page}`;

    const res = await axios.get(api, {
      headers: {
        Referer: `${MAIN_URL}/home`,
        Cookie: "ott=dp; hd=on;",
      },
    });

    const data = res.data;

    if (!Array.isArray(data?.episodes)) break;

    data.episodes.forEach((ep: any) => {
      episodes.push({
        title: `E${ep.ep} - ${ep.t}`,
        link: `${ep.id}|${title}`,
        image: `https://imgcdn.kim/hsepimg/150/${ep.id}.jpg`,
      });
    });

    if (data.nextPageShow === 0) break;
    page++;
  }

  return episodes;
}
