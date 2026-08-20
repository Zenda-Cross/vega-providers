import { Post, ProviderContext } from "../types";

const BASE_URL = "https://kaa.lt";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function formatPoster(poster?: { hq?: string; sm?: string; url?: string }): string {
  if (!poster) return "";
  if (poster.hq) return `${BASE_URL}/image/poster/${poster.hq}.webp`;
  if (poster.sm) return `${BASE_URL}/image/poster/${poster.sm}.webp`;
  if (poster.url) return poster.url.startsWith("http") ? poster.url : `${BASE_URL}/${poster.url}`;
  return "";
}

export const getPosts = async function ({
  filter,
  page = 1,
  providerContext,
}: {
  filter: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  let url = `${BASE_URL}${filter}`;

  if (filter.includes("/api/show/trending")) {
    url = `${BASE_URL}/api/show/trending?page=${page}`;
  } else if (filter.includes("/api/show/popular")) {
    url = `${BASE_URL}/api/show/popular?page=${page}`;
  } else if (filter.includes("/api/show/recent")) {
    const typeMatch = filter.match(/type=([a-z]+)/);
    const type = typeMatch ? typeMatch[1] : "all";
    url = `${BASE_URL}/api/show/recent?type=${type}&page=${page}`;
  } else if (filter.startsWith("/api/anime")) {
    url = `${BASE_URL}/api/anime?page=${page}`;
  } else {
    // Genre filter
    const encoded = btoa(JSON.stringify({ genres: [filter] }));
    url = `${BASE_URL}/api/anime?page=${page}&filters=${encoded}`;
  }

  const res = await axios.get(url, { headers });
  const list = res.data?.result || [];

  return list.map((item: any) => ({
    title: item.title_en || item.title || "",
    link: `${BASE_URL}/${item.slug}`,
    image: formatPoster(item.poster),
  }));
};

export const getSearchPosts = async function ({
  searchQuery,
  page = 1,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;

  const res = await axios.post(
    `${BASE_URL}/api/fsearch`,
    {
      page,
      query: searchQuery,
    },
    {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Referer: `${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`,
      },
    }
  );

  const list = res.data?.result || [];

  return list.map((item: any) => ({
    title: item.title_en || item.title || "",
    link: `${BASE_URL}/${item.slug}`,
    image: formatPoster(item.poster),
  }));
};
