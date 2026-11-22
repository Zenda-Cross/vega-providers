// posts.ts
import { Post, ProviderContext } from "../types";

const BASE_URL = "https://cd2735efc006-orangestream.baby-beamup.club";

const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  Referer: `${BASE_URL}/`,
};

// ─── Normal catalog posts ────────────────────────────────────────────
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
  return fetchCatalog({
    filter: filter ?? "",
    page,
    signal,
    providerContext,
  });
}

// ─── Search posts ────────────────────────────────────────────────────
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
  if (!searchQuery.trim()) return [];

  // The manifest exposes "toonix_search" for BOTH series and movie.
  // Query both and merge (dedupe by id) so results are comprehensive.
  const [seriesPosts, moviePosts] = await Promise.all([
    fetchSearch({ type: "series", query: searchQuery, page, signal, providerContext }),
    fetchSearch({ type: "movie",  query: searchQuery, page, signal, providerContext }),
  ]);

  const seen = new Set<string>();
  const merged: Post[] = [];
  for (const p of [...seriesPosts, ...moviePosts]) {
    const key = p.link;
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(p);
    }
  }
  return merged;
}

// ─── Internals ───────────────────────────────────────────────────────

async function fetchCatalog({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  try {
    // filter example: "series|toonix_trending"
    const [type, catalogId] = filter.split("|");
    if (!type || !catalogId) return [];

    const skip = Math.max(0, page - 1) * 100;
    const extra: string[] = [];
    if (skip > 0) extra.push(`skip=${skip}`);
    const suffix = extra.length ? `/${extra.join("&")}` : "";

    const url = `${BASE_URL}/catalog/${encodeURIComponent(
      type,
    )}/${encodeURIComponent(catalogId)}${suffix}.json`;

    console.log("[orangestream] catalog:", url);
    const res = await axios.get(url, { headers, signal, timeout: 25_000 });
    const metas: any[] = res.data?.metas ?? [];

    return metas.map(m => mapMetaToPost(m, type));
  } catch (err: any) {
    console.error("[orangestream] fetchCatalog error:", err?.message ?? err);
    return [];
  }
}

async function fetchSearch({
  type,
  query,
  page,
  signal,
  providerContext,
}: {
  type: "series" | "movie";
  query: string;
  page: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  try {
    const skip = Math.max(0, page - 1) * 100;
    // search= must come first for the isRequired extra; skip is additive.
    const extra = [`search=${encodeURIComponent(query)}`];
    if (skip > 0) extra.push(`skip=${skip}`);

    const url = `${BASE_URL}/catalog/${encodeURIComponent(
      type,
    )}/toonix_search/${extra.join("&")}.json`;

    console.log("[orangestream] search:", url);
    const res = await axios.get(url, { headers, signal, timeout: 25_000 });
    const metas: any[] = res.data?.metas ?? [];
    return metas.map(m => mapMetaToPost(m, type));
  } catch (err: any) {
    console.warn(`[orangestream] search(${type}) error:`, err?.message ?? err);
    return [];
  }
}

function mapMetaToPost(m: any, type: string): Post {
  return {
    title: m?.name ?? "Untitled",
    // Encode the type too so getMeta can hit the right /meta/{type}/{id}
    link: `${type}::${m?.id ?? ""}`,
    image: m?.poster ?? m?.background ?? "",
  };
}