import { Post, ProviderContext } from "../types";

/* =========================
   BASE URLs (from Kotlin)
========================= */
const CINEMETA_URL = "https://v3-cinemeta.strem.io";
const AIO_META_URL =
  "https://aiometadata.elfhosted.com/stremio/9197a4a9-2f5b-4911-845e-8704c520bdf7";
const KITSU_URL = "https://anime-kitsu.strem.fun";

/* =========================
   Helpers
========================= */
function resolvePoster(url?: string): string {
  if (!url) return "";
  if (url.includes("metahub.space")) {
    return (
      "https://wsrv.nl/?url=" +
      url.replace("/small/", "/large/").replace("/medium/", "/large/")
    );
  }
  return url;
}

function buildPost(item: any): Post {
  // Default to "movie" if type is missing, or use the item's type
  const type = item.type || "movie";
  const id = item.id;
  
  // Select the correct base URL. 
  // If it's anime or a kitsu ID, use Kitsu URL, otherwise use Cinemeta.
  const baseUrl = (type === "anime" || String(id).startsWith("kitsu"))
    ? KITSU_URL
    : CINEMETA_URL;

  return {
    title: item.aliases?.[0] || item.name || "",
    // UPDATED: Returns direct HTTPS link to the metadata JSON
    link: `${baseUrl}/meta/${type}/${id}.json`,
    image: resolvePoster(item.poster),
  };
}

/* =========================
   MAIN POSTS
========================= */
export function getPosts({
  filter = "movie",
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;

  const skip = (page - 1) * 50;

  const url =
    filter === "anime"
      ? `${KITSU_URL}/catalog/anime/kitsu-anime-trending/skip=${skip}.json`
      : `${AIO_META_URL}/catalog/${filter}/tvdb.trending/skip=${skip}.json`;

  return axios
    .get(url, { signal })
    .then((res: any) => {
      const metas = res.data?.metas || [];
      return metas.map(buildPost);
    })
    .catch(() => {
      return [];
    });
}

/* =========================
   SEARCH
========================= */
export function getSearchPosts({
  searchQuery,
  signal,
  providerContext,
}: {
  searchQuery: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;

  const endpoints = [
    `${CINEMETA_URL}/catalog/movie/top/search=${encodeURIComponent(
      searchQuery
    )}.json`,
    `${CINEMETA_URL}/catalog/series/top/search=${encodeURIComponent(
      searchQuery
    )}.json`,
    `${KITSU_URL}/catalog/anime/kitsu-anime-airing/search=${encodeURIComponent(
      searchQuery
    )}.json`,
  ];

  const requestPromises = endpoints.map((u) =>
    axios
      .get(u, { signal })
      .then((r: any) => r.data?.metas || [])
      .catch(() => [])
  );

  return Promise.all(requestPromises)
    .then((results) => {
      // merge like Kotlin
      const merged: Post[] = [];
      const max = Math.max(...results.map((r) => r.length));

      for (let i = 0; i < max; i++) {
        for (const list of results) {
          if (list[i]) merged.push(buildPost(list[i]));
        }
      }

      return merged;
    })
    .catch(() => {
      return [];
    });
}