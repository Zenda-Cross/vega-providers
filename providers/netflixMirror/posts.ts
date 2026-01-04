import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

// Cookies from Kotlin: ott=nf, hd=on, user_token=..., t_hash_t (dynamic/bypass)
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  Cookie: "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50; t_hash_t=",
  Referer: `${MAIN_URL}/`,
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
    case "top10":
      query = "top 10";
      break;

    case "movies":
      query = "movie";
      break;

    case "tv":
      query = "season";
      break;

    case "home":
    default:
      query = ""; // mixed / latest
      break;
  }

  const url = `${MAIN_URL}/search.php?s=${encodeURIComponent(
    query
  )}&t=${unixTime}`;

  const searchHeaders = {
    ...headers,
    Referer: `${MAIN_URL}/tv/home`,
  };

  try {
    const res = await axios.get(url, { headers: searchHeaders });
    const results = res.data?.searchResult || [];

    return results.map((item: any) => ({
      title: item.t || "Movie / Show",
      image: `https://imgcdn.kim/poster/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("NetflixMirror home/search error:", e);
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
  
  // Kotlin: "$mainUrl/search.php?s=$query&t=${APIHolder.unixTime}"
  // Referer: "$mainUrl/tv/home"
  const url = `${MAIN_URL}/search.php?s=${encodeURIComponent(searchQuery)}&t=${unixTime}`;
  const searchHeaders = { ...headers, Referer: `${MAIN_URL}/tv/home` };

  try {
    const res = await axios.get(url, { headers: searchHeaders });
    const data = res.data;
    const results = data.searchResult || [];

    return results.map((item: any) => ({
      title: item.t || "",
      // Kotlin: "https://imgcdn.kim/poster/v/${it.id}.jpg"
      image: `https://imgcdn.kim/poster/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("NetflixMirror search error:", e);
    return [];
  }
}