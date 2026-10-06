import { Post, ProviderContext } from "../types";
import { apiHome, apiSearch, pickRows, mediaLink, SERIES_TYPES } from "./castleCore";

const SKIP_HOME_ROWS = new Set(["Hot Erotic Series", "Bollywood Star"]);
const PAGE_LIMIT = 20;

function normalizeType(movieType: any): "series" | "movie" {
  return SERIES_TYPES.has(String(movieType)) ? "series" : "movie";
}

function mapPost(item: any): Post | null {
  if (!item) return null;
  const id    = item.id ?? item.redirectId;
  const title = item.title || item.name;
  if (!id || !title) return null;
  const image = item.coverVerticalImage || item.coverHorizontalImage || item.coverImage || "https://img1.fhxod.com/placeholder.jpg";
  return {
    title,
    link:  mediaLink(id),
    image,
  };
}

export async function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    // "movie" / "series" → fetch home, filter by type
    if (filter === "movie" || filter === "series") {
      const env  = await apiHome(page, providerContext, signal);
      const rows = pickRows(env);
      const out: Post[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        if (!row || SKIP_HOME_ROWS.has(String(row.name || ""))) continue;
        for (const item of row.contents ?? []) {
          if (normalizeType(item.movieType) !== filter) continue;
          const p = mapPost(item);
          if (p && !seen.has(p.link)) {
            seen.add(p.link);
            out.push(p);
            if (out.length >= PAGE_LIMIT) return out;
          }
        }
      }
      return out;
    }

    // Empty filter / trending / home → merged feed
    if (!filter || filter === "trending" || filter === "home") {
      const env  = await apiHome(page, providerContext, signal);
      const rows = pickRows(env);
      const out: Post[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        if (!row || SKIP_HOME_ROWS.has(String(row.name || ""))) continue;
        for (const item of row.contents ?? []) {
          const p = mapPost(item);
          if (p && !seen.has(p.link)) {
            seen.add(p.link);
            out.push(p);
            if (out.length >= PAGE_LIMIT) return out;
          }
        }
      }
      return out;
    }

    // Anything else → keyword search
    return await getSearchPosts({ searchQuery: filter, page, signal, providerContext });
  } catch (err) {
    console.error("CastleTV getPosts error:", err);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    if (!searchQuery?.trim()) return [];
    const env  = await apiSearch(searchQuery.trim(), page, providerContext, signal);
    const rows = pickRows(env);
    const out: Post[] = [];
    const seen = new Set<string>();
    for (const item of rows) {
      const p = mapPost(item);
      if (p && !seen.has(p.link)) {
        seen.add(p.link);
        out.push(p);
        if (out.length >= PAGE_LIMIT) return out;
      }
    }
    return out;
  } catch (err) {
    console.error("CastleTV search error:", err);
    return [];
  }
}
