import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios } = providerContext;
    const p = Math.max(1, page);
    const url = `https://api2.imdb3.shop/api/movies/list/filter?platform=disney&page=${p}`;
    const res = await axios.get(url, {
      signal,
      headers: {
        Referer: "https://officialmoviebox.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    let items = res.data?.results || [];
    if (filter && filter !== "disney") {
      const lower = filter.toLowerCase();
      items = items.filter((item: any) =>
        (item?.title || "").toLowerCase().includes(lower) ||
        (item?.channel || "").toLowerCase().includes(lower)
      );
    }

    return items.map((item: any) => {
      const isTv = item?.media_type === "tv" || (item?.title || "").includes("S1");
      return {
        title: (item?.title || "").trim(),
        link: `${item?.id}|${isTv ? "tv" : "movie"}`,
        image: item?.backdrop_path || "",
        tag: item?.release_date || (isTv ? "Series" : "Movie"),
      };
    });
  } catch (err) {
    console.error("disneyMirror getPosts error:", err);
    return [];
  }
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios } = providerContext;
    const query = searchQuery?.trim().toLowerCase();
    if (!query) return [];

    const url = `https://api2.imdb3.shop/api/movies/list/filter?platform=disney&page=${Math.max(1, page)}`;
    const res = await axios.get(url, {
      signal,
      headers: {
        Referer: "https://officialmoviebox.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const items = (res.data?.results || []).filter((item: any) =>
      (item?.title || "").toLowerCase().includes(query)
    );

    return items.map((item: any) => {
      const isTv = item?.media_type === "tv" || (item?.title || "").includes("S1");
      return {
        title: (item?.title || "").trim(),
        link: `${item?.id}|${isTv ? "tv" : "movie"}`,
        image: item?.backdrop_path || "",
        tag: item?.release_date || (isTv ? "Series" : "Movie"),
      };
    });
  } catch (err) {
    console.error("disneyMirror getSearchPosts error:", err);
    return [];
  }
};
