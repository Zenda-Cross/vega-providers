import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

const BASE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/home`,
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

export async function getPosts({
  filter,
  page = 1,
  providerContext,
}: {
  filter: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  let query = "";
  if (filter === "movies") query = "movie";
  else if (filter === "tv") query = "season";
  else if (filter === "top10") query = "top";

  const bypass = await getBypassCookie(axios);

  const headers = {
    ...BASE_HEADERS,
    Cookie: `ott=pv; hd=on; ${bypass}`,
    Referer: `${MAIN_URL}/tv/home`,
  };

  const url = `${MAIN_URL}/pv/search.php?s=${encodeURIComponent(
    query
  )}&t=${unixTime}`;

  try {
    const res = await axios.get(url, { headers });
    const results = res.data?.searchResult ?? [];

    return results.map((item: any) => ({
      title: item.t,
      image: `https://imgcdn.kim/pv/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch {
    return [];
  }
}
