import { Stream, ProviderContext } from "../types";
import {
  allowedResolutions,
  detectStreamType,
  getJson,
  parseQuality,
  parseRef,
  readHints,
  serverName,
} from "./bridge";

/**
 * Hides resolutions the user did not allow, but only when something better is
 * available; streams with an unknown quality are always kept so a title never
 * ends up with no source.
 */
function filterResolutions(streams: Stream[], allowed: string[] | null): Stream[] {
  if (!allowed) return streams;
  const set = new Set(allowed);
  const hasMatch = streams.some(stream => stream.quality && set.has(stream.quality));
  if (!hasMatch) return streams;
  return streams.filter(stream => !stream.quality || set.has(stream.quality));
}

function rank(stream: Stream, isDownload: boolean): number {
  const secure = /^https:/i.test(stream.link) ? 0 : 2;
  if (isDownload) {
    const file = stream.type === "mp4" || stream.type === "mkv" ? 0 : 1;
    return file * 10 + secure;
  }
  const kind = stream.type === "m3u8" ? 0 : stream.type === "mpd" ? 1 : 2;
  return kind * 10 + secure;
}

/**
 * The bridge already resolved every CloudStream source to a playable URL, so
 * this only maps its Stremio stream objects onto Vega streams.
 */
export const getStream = async function ({
  link,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const ref = parseRef(link);
  if (!ref.id) throw new Error("CNCVerse: invalid stream link");
  const body = await getJson(
    providerContext,
    `/stream/${encodeURIComponent(ref.type)}/${encodeURIComponent(ref.id)}.json`,
    signal,
    90000,
  );
  const list: any[] = Array.isArray(body?.streams) ? body.streams : [];
  const live = ref.type === "tv";
  const streams: Stream[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    // Donation cards and external links have no `url`; torrents carry infoHash.
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const hints = readHints(item.behaviorHints);
    const quality = parseQuality(item.name, hints.filename);
    streams.push({
      server: serverName(item.name),
      link: url,
      type: detectStreamType(url, hints.filename),
      ...(quality ? { quality } : {}),
      ...(hints.headers ? { headers: hints.headers } : {}),
      ...(live ? { tag: "LIVE" } : {}),
    });
  }

  if (!streams.length) throw new Error("CNCVerse: no playable source for this title");
  const download = Boolean(isDownload);
  return filterResolutions(streams, await allowedResolutions(providerContext))
    .map((stream, index) => ({ stream, index }))
    .sort((a, b) => rank(a.stream, download) - rank(b.stream, download) || a.index - b.index)
    .map(entry => entry.stream);
};
