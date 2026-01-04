import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

/**
 * Get t_hash_t cookie
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${MAIN_URL}/`,
        Cookie: "ott=dp; hd=on;",
      },
    });

    const sc = res.headers["set-cookie"];
    if (sc) {
      const raw = Array.isArray(sc) ? sc.join(";") : sc;
      const match = raw.match(/t_hash_t=[^;]+/);
      if (match) return match[0];
    }
  } catch {}

  return "";
}

/**
 * MAP CATALOG → SEARCH KEYWORD
 */
function mapFilterToQuery(filter: string): string {
  switch (filter) {
    case "movie":
      return "movie";
    case "show":
      return "series";
    case "10":
      return "10";
    default:
      return "h";
  }
}

/**
 * POSTS (HOME + CATALOG)
 */
export async function getPosts({
  filter,
  providerContext,
}: {
  filter: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const t = Math.floor(Date.now() / 1000);

  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  const query = mapFilterToQuery(filter);

  const res = await axios.get(`${MAIN_URL}/mobile/hs/search.php`, {
    params: {
      s: query,
      t,
    },
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${MAIN_URL}/home`,
      Cookie: `${tHash}; ott=dp; hd=on`,
    },
  });

  if (!res.data?.searchResult) return [];

  return res.data.searchResult.map((it: any) => ({
    title: it.t,
    link: it.id,
    image: `https://imgcdn.kim/hs/v/${it.id}.jpg`,
  }));
}

/**
 * SEARCH (USER SEARCH)
 */
export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const t = Math.floor(Date.now() / 1000);

  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  const res = await axios.get(`${MAIN_URL}/mobile/hs/search.php`, {
    params: {
      s: searchQuery,
      t,
    },
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${MAIN_URL}/home`,
      Cookie: `${tHash}; ott=dp; hd=on`,
    },
  });

  if (!res.data?.searchResult) return [];

  return res.data.searchResult.map((it: any) => ({
    title: it.t,
    link: it.id,
    image: `https://imgcdn.kim/hs/v/${it.id}.jpg`,
  }));
}
