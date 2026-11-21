import { ProviderContext, Stream } from "../types";

const ORIGIN = "https://st.111477.xyz";
// Site default host, configured to request just one file per lookup.
const DEFAULT_CONFIG = "aHR0cHM6Ly9hLjExMTQ3Ny54eXovOjpsaW1pdD0x";

interface Request {
  imdbId: string;
  tmdbId: string;
  season: number;
  episode: number;
  isMovie: boolean;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}

export async function extractSt111477Streams({
  imdbId, tmdbId, season, episode, isMovie, providerContext, signal,
}: Request): Promise<Stream[]> {
  const kv = providerContext.kvStore;
  if ((await kv?.get<boolean>("autoEmbed_st111477Enabled")) === false) return [];

  const id = /^tt\d+$/.test(imdbId) ? imdbId : /^\d+$/.test(tmdbId) ? `tmdb:${tmdbId}` : "";
  if (!id || (!isMovie && (![season, episode].every(Number.isSafeInteger) || season < 0 || episode < 1))) return [];

  const manifest = (await kv?.get<string>("autoEmbed_st111477Manifest"))?.trim();
  const config = manifest
    ? manifest.match(/^(?:https|stremio):\/\/st\.111477\.xyz\/config\/([\w-]+)\/manifest\.json$/i)?.[1]
    : DEFAULT_CONFIG;
  if (!config) return [];

  const target = isMovie ? id : `${id}:${season}:${episode}`;
  const { data } = await providerContext.axios.get(
    `${ORIGIN}/config/${config}/stream/${isMovie ? "movie" : "series"}/${target}.json`,
    { timeout: 8000, signal },
  );

  if (!Array.isArray(data?.streams)) return [];
  const seen = new Set<string>();
  const results: Stream[] = [];
  for (const entry of data.streams) {
    const link = typeof entry?.url === "string" ? entry.url.trim() : "";
    if (!/^https?:\/\//i.test(link) || seen.has(link)) continue;
    let url: URL;
    try { url = new URL(link); } catch { continue; }
    if (url.origin === ORIGIN && url.pathname.startsWith("/slowdown")) continue;

    const title = typeof entry.title === "string" ? entry.title : "";
    const name = typeof entry.name === "string" ? entry.name : "";
    const label = `${title} ${name}`;
    const tail = label.match(/\b(2160|1080|720|480|360)p?\b/i)?.[1];
    const quality = tail || (/\b4k\b/i.test(label) ? "2160" : undefined);
    const size = label.match(/\b\d+(?:\.\d+)?\s*(?:KiB|MiB|GiB|KB|MB|GB|TB)\b/i)?.[0];
    const mediaPath = `${url.pathname} ${title}`;
    const type = /\.m3u8\b/i.test(mediaPath) ? "m3u8"
      : /\.mpd\b/i.test(mediaPath) ? "dash"
      : /\.mkv\b/i.test(mediaPath) ? "mkv" : "mp4";
    seen.add(link);
    results.push({
      server: "111477", link, type, quality,
      ...(size ? { tags: [size], tag: size } : {}),
    });
  }
  return results;
}
