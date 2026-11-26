import { Post, ProviderContext } from "../types";
import {
  bridgeCatalogs,
  getJson,
  hiddenCatalogs,
  isBlankTitle,
  lookupTitlesEnabled,
  makeRef,
  mapLimit,
  parseRef,
  readTitles,
  rememberTitles,
} from "./bridge";

const PAGE = 40;
const MEM_TTL = 5 * 60 * 1000;
const DISK_TTL = 15 * 60 * 1000;
const DISK_MAX = 250000;

interface Cached {
  t: number;
  metas: any[];
}

const memory = new Map<string, Cached>();

function usable(value: unknown): any[] | null {
  return Array.isArray(value) ? value : null;
}

async function readCache(providerContext: ProviderContext, key: string, ttl: number): Promise<any[] | null> {
  const hot = memory.get(key);
  if (hot && Date.now() - hot.t < ttl) return hot.metas;
  try {
    const stored = await providerContext.kvStore?.get<Cached>(key);
    if (stored && Array.isArray(stored.metas) && Date.now() - (stored.t || 0) < ttl) {
      memory.set(key, { t: stored.t, metas: stored.metas });
      return stored.metas;
    }
  } catch {
    // cache is optional
  }
  return null;
}

async function writeCache(providerContext: ProviderContext, key: string, metas: any[]): Promise<void> {
  const entry = { t: Date.now(), metas };
  memory.set(key, entry);
  try {
    if (JSON.stringify(metas).length <= DISK_MAX) await providerContext.kvStore?.set(key, entry);
  } catch {
    // cache is optional
  }
}

async function catalogMetas(
  providerContext: ProviderContext,
  type: string,
  id: string,
  signal?: AbortSignal,
): Promise<any[]> {
  const key = `cncverse_cat:${type}:${id}`;
  const cached = await readCache(providerContext, key, DISK_TTL);
  if (cached) return cached;
  const body = await getJson(
    providerContext,
    `/catalog/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`,
    signal,
    90000,
  );
  const metas = usable(body?.metas) || [];
  const seen = new Set<string>();
  const unique = metas.filter(meta => {
    const metaId = meta?.id;
    if (typeof metaId !== "string" || !metaId || seen.has(metaId)) return false;
    seen.add(metaId);
    return true;
  });
  await writeCache(providerContext, key, unique);
  return unique;
}

async function searchCatalog(
  providerContext: ProviderContext,
  type: string,
  id: string,
  query: string,
  signal?: AbortSignal,
): Promise<any[]> {
  const key = `cncverse_search:${type}:${id}:${query.toLowerCase()}`;
  const cached = await readCache(providerContext, key, DISK_TTL);
  if (cached) return cached;
  const body = await getJson(
    providerContext,
    `/catalog/${encodeURIComponent(type)}/${encodeURIComponent(id)}/search=${encodeURIComponent(query)}.json`,
    signal,
    30000,
  );
  const metas = usable(body?.metas) || [];
  await writeCache(providerContext, key, metas);
  return metas;
}

/**
 * Some CloudStream plugins (Netflix, Prime Video, Disney…) send TMDB items with
 * an empty title; the real name only exists on the meta endpoint, so a page of
 * those is filled in here and remembered for the next visit.
 */
async function fillTitles(
  providerContext: ProviderContext,
  items: { meta: any; title: string; type: string }[],
  signal?: AbortSignal,
): Promise<void> {
  const pending = items.filter(item => isBlankTitle(item.title));
  if (!pending.length) return;
  // The meta endpoint has to resolve every episode of a show, so a page of
  // TMDB-style items (Netflix, Prime…) is the slow path; titles are cached.
  await mapLimit(pending, 10, async item => {
    const meta = (await getJson(providerContext, `/meta/${item.type}/${item.meta.id}.json`, signal, 45000))?.meta;
    if (meta && !isBlankTitle(meta.name)) item.title = String(meta.name);
    return null;
  });
}

async function toPosts(
  providerContext: ProviderContext,
  metas: any[],
  type: string,
  signal?: AbortSignal,
): Promise<Post[]> {
  const known = await readTitles(providerContext);
  const items = metas
    .filter(meta => meta && typeof meta.id === "string" && meta.id)
    .map(meta => {
      const hit = known[meta.id];
      const title = !isBlankTitle(meta.name) ? String(meta.name) : hit?.n || "";
      const poster = String(meta.poster || meta.background || hit?.p || "");
      return { meta, title, type, poster };
    });
  // With lookups off, only titles already cached (or named by the plugin) are
  // shown. A page where every item is unnamed is still looked up, otherwise
  // Netflix/Prime/Hotstar would render as an empty catalog.
  const lookups = await lookupTitlesEnabled(providerContext);
  const allBlank = items.length > 0 && items.every(item => isBlankTitle(item.title));
  if (lookups || allBlank) await fillTitles(providerContext, items, signal);
  const live = type === "tv";
  const posts: Post[] = [];
  const remembered: { id: string; title: string; poster?: string }[] = [];
  for (const { meta, title, poster } of items) {
    const clean = title.trim();
    if (!clean) continue;
    remembered.push({ id: meta.id, title: clean, poster });
    posts.push({
      title: clean,
      link: makeRef(type, meta.id),
      image: poster,
      ...(live ? { tag: "LIVE", aspectRatio: 16 / 9 } : {}),
    });
  }
  if (remembered.length) await rememberTitles(providerContext, remembered);
  return posts;
}

export const getPosts = async function ({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { type, id } = parseRef(filter);
  if (!id) return [];
  const metas = await catalogMetas(providerContext, type, id, signal);
  // The bridge forwards `skip` to CloudStream's getMainPage(page = skip / 20),
  // and most plugins ignore that page argument and return the whole home page.
  // Paging here is therefore done over the single home-page response.
  const offset = (Math.max(1, page) - 1) * PAGE;
  return toPosts(providerContext, metas.slice(offset, offset + PAGE), type, signal);
};

export const getSearchPosts = async function ({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const query = String(searchQuery || "").trim();
  if (!query || page > 1) return [];
  const hidden = new Set(await hiddenCatalogs(providerContext));
  const catalogs = (await bridgeCatalogs(providerContext, signal)).filter(
    item => !hidden.has(makeRef(item.type, item.id)),
  );
  const results = await mapLimit(catalogs, 6, async item => {
    try {
      const metas = await searchCatalog(providerContext, item.type, item.id, query, signal);
      return metas.map(meta => ({ meta, type: item.type }));
    } catch {
      return [];
    }
  });
  const known = await readTitles(providerContext);
  const seen = new Set<string>();
  const found: { meta: any; type: string; title: string; poster: string }[] = [];
  const lists = results.map(list => list || []);
  const longest = lists.reduce((max, list) => Math.max(max, list.length), 0);
  // Round-robin the catalogs so one big plugin cannot crowd out the rest.
  for (let index = 0; index < longest; index++) {
    for (const list of lists) {
      const entry = list[index];
      const id = entry?.meta?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const hit = known[id];
      found.push({
        meta: entry.meta,
        type: entry.type,
        title: !isBlankTitle(entry.meta.name) ? String(entry.meta.name) : hit?.n || "",
        poster: String(entry.meta.poster || entry.meta.background || hit?.p || ""),
      });
    }
  }
  const ordered = found
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const blank = Number(isBlankTitle(a.entry.title)) - Number(isBlankTitle(b.entry.title));
      if (blank) return blank;
      const live = Number(a.entry.type === "tv") - Number(b.entry.type === "tv");
      if (live) return live;
      return a.index - b.index;
    })
    .slice(0, 60)
    .map(item => item.entry);
  if (await lookupTitlesEnabled(providerContext)) {
    await fillTitles(providerContext, ordered.slice(0, 24), signal);
  }
  const posts: Post[] = [];
  const remembered: { id: string; title: string; poster?: string }[] = [];
  for (const entry of ordered) {
    const title = entry.title.trim();
    if (!title) continue;
    remembered.push({ id: entry.meta.id, title, poster: entry.poster });
    posts.push({
      title,
      link: makeRef(entry.type, entry.meta.id),
      image: entry.poster,
      ...(entry.type === "tv" ? { tag: "LIVE", aspectRatio: 16 / 9 } : {}),
    });
  }
  if (remembered.length) await rememberTitles(providerContext, remembered);
  return posts;
};
