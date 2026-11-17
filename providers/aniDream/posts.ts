import { throwProviderError } from "../providerErrors";
import { Post, ProviderContext } from "../types";
import {
  buildAnimeUrl,
  callServerFn,
  extractMediaImage,
  extractMediaTitle,
  resolveBaseUrl,
  SERVER_FNS,
} from "./client";

const PAGE_LIMIT = 20;

function mapMediaToPosts(items: any[], baseUrl: string): Post[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<number>();
  const posts: Post[] = [];

  for (const item of items) {
    const media = item?.card || item;
    const id = Number(item?.animeId || media?.id);
    if (!Number.isFinite(id) || id <= 0 || seenIds.has(id)) continue;

    const title = extractMediaTitle(media?.title);
    const image = extractMediaImage(media);
    if (!title || !image) continue;

    seenIds.add(id);
    posts.push({
      title,
      link: buildAnimeUrl(baseUrl, id),
      image,
    });
  }

  return posts;
}

export const getPosts = async function ({
  filter,
  page = 1,
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
    const baseUrl = await resolveBaseUrl();
    const cleanFilter = String(filter || "").trim();

    if (cleanFilter.startsWith("releases:")) {
      const audio = cleanFilter.slice("releases:".length) || "all";
      const result = await callServerFn<{ releases?: any[] }>(
        SERVER_FNS.RELEASES,
        { isAdult: false, audio, page },
        { providerContext, signal, baseUrl },
      );
      return mapMediaToPosts(result?.releases || [], baseUrl);
    }

    if (cleanFilter.startsWith("home:")) {
      if (page > 1) return [];
      const key = cleanFilter.slice("home:".length);
      const result = await callServerFn<any>(
        SERVER_FNS.HOME,
        { lang: "en", isAdult: false },
        { providerContext, signal, baseUrl },
      );
      const list =
        key === "this_season"
          ? result?.this_season
          : key === "top_week"
            ? result?.anime_top?.week
            : key === "popular"
              ? result?.popular_anime
              : result?.new_anime;
      return mapMediaToPosts(list || [], baseUrl);
    }

    if (cleanFilter.startsWith("genre:")) {
      const genre = cleanFilter.slice("genre:".length).trim();
      const result = await callServerFn<{ items?: any[] }>(
        SERVER_FNS.BROWSE,
        {
          type: "ANIME",
          genres: genre ? [genre] : undefined,
          available: true,
          sort: "popularity",
          isAdult: false,
          page,
          limit: PAGE_LIMIT,
        },
        { providerContext, signal, baseUrl, referer: `${baseUrl}/browse` },
      );
      return mapMediaToPosts(result?.items || [], baseUrl);
    }

    const sort = cleanFilter.startsWith("sort:")
      ? cleanFilter.slice("sort:".length) || "trending"
      : "trending";

    const result = await callServerFn<{ items?: any[] }>(
      SERVER_FNS.BROWSE,
      {
        type: "ANIME",
        available: true,
        sort,
        isAdult: false,
        page,
        limit: PAGE_LIMIT,
      },
      { providerContext, signal, baseUrl, referer: `${baseUrl}/browse` },
    );

    return mapMediaToPosts(result?.items || [], baseUrl);
  } catch (err) {
    throwProviderError("AniDream", "posts", err);
  }
};

export const getSearchPosts = async function ({
  searchQuery,
  page = 1,
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
    const query = String(searchQuery || "").trim();
    if (!query) return [];

    const baseUrl = await resolveBaseUrl();
    const result = await callServerFn<{ items?: any[] }>(
      SERVER_FNS.BROWSE,
      {
        type: "ANIME",
        q: query,
        available: true,
        isAdult: false,
        page,
        limit: PAGE_LIMIT,
      },
      { providerContext, signal, baseUrl, referer: `${baseUrl}/browse` },
    );

    return mapMediaToPosts(result?.items || [], baseUrl);
  } catch (err) {
    throwProviderError("AniDream", "search", err);
  }
};
