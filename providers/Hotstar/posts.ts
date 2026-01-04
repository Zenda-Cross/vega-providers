import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

/**
 * Kotlin cookies:
 * ott=hs, hd=on, t_hash_t (dynamic)
 */
const baseHeaders = {
  "User-Agent": UA,
  "X-Requested-With": "XMLHttpRequest",
  "Cookie": "ott=hs; hd=on;",
  "Referer": `${MAIN_URL}/home`,
};

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

  switch (filter) {
    case "movies":
      query = "movie";
      break;
    case "series":
      query = "season";
      break;
    case "home":
    default:
      query = "h";
      break;
  }

  /**
   * Kotlin:
   * $mainUrl/mobile/hs/search.php?s=$query&t=$unixTime
   */
  const url = `${MAIN_URL}/mobile/hs/search.php?s=${encodeURIComponent(
    query
  )}&t=${unixTime}`;

  try {
    const res = await axios.get(url, {
      headers: {
        ...baseHeaders,
        Referer: `${MAIN_URL}/home`,
      },
    });

    const results = res.data?.searchResult || [];

    return results.map((item: any) => ({
      title: item.t || "Hotstar",
      image: `https://imgcdn.kim/hs/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("Hotstar posts error:", e);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  const url = `${MAIN_URL}/mobile/hs/search.php?s=${encodeURIComponent(
    searchQuery
  )}&t=${unixTime}`;

  try {
    const res = await axios.get(url, {
      headers: {
        ...baseHeaders,
        Referer: `${MAIN_URL}/home`,
      },
    });

    const results = res.data?.searchResult || [];

    return results.map((item: any) => ({
      title: item.t || "",
      image: `https://imgcdn.kim/hs/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("Hotstar search error:", e);
    return [];
  }
}
