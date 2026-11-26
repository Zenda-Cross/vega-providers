import { Catalog, ProviderContext } from "../types";
import { bridgeCatalogs, catalogTitle, hiddenCatalogs, makeRef } from "./bridge";

const FALLBACK: Catalog[] = [
  { title: "VegaMovies", filter: "other|cnc_VegaMovies_other" },
  { title: "HDHub4U", filter: "other|cnc_HDHub4U_other" },
  { title: "4K HDHUB", filter: "other|cnc_4KHDHUB_other" },
  { title: "Netflix", filter: "other|cnc_Netflix_other" },
  { title: "Prime Video", filter: "other|cnc_PrimeVideo_other" },
  { title: "Jio Tv +", filter: "tv|cnc_JioTvPlus_tv" },
];

/**
 * One Vega category per CloudStream plugin the bridge exposes: VOD collections
 * (VegaMovies, Netflix, HDHub4U, …) and Live TV groups (Jio TV +, Clown IPTV, …).
 */
export const catalog = async (params?: {
  providerContext?: ProviderContext;
  signal?: AbortSignal;
}): Promise<Catalog[]> => {
  const providerContext = params?.providerContext;
  if (!providerContext) return FALLBACK;
  const list = await bridgeCatalogs(providerContext, params?.signal);
  const hidden = new Set(await hiddenCatalogs(providerContext));
  const seen = new Set<string>();
  const out: Catalog[] = [];
  for (const item of list) {
    const title = catalogTitle(item.name);
    if (!title) continue;
    const filter = makeRef(item.type, item.id);
    if (seen.has(filter) || hidden.has(filter)) continue;
    seen.add(filter);
    out.push({ title, filter });
  }
  return out.length ? out : FALLBACK;
};

export const genres: Catalog[] = [];
