import { ProviderContext, Stream } from "../types";
import {
  apiMovieDetails,
  apiVideoUrl,
  parsePlayLink,
  pickDetails,
  RESOLUTIONS,
  QUALITY_NAME,
  QUALITY_NUM,
} from "./castleCore";

export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { movieId, episodeId } = parsePlayLink(link);
    if (!movieId) return [];

    const env      = await apiMovieDetails(movieId, providerContext, signal);
    const details  = pickDetails(env);
    const episodes: any[] = Array.isArray(details.episodes) ? details.episodes : [];
    if (!episodes.length) return [];

    let episode =
      (episodeId && episodes.find((e) => String(e.id) === String(episodeId))) ||
      (episodes.length === 1 ? episodes[0] : null) ||
      episodes[0];
    if (!episode?.id) return [];

    const epId   = String(episode.id);
    const title  = details.title || "Castle TV";
    const tracks: any[] = Array.isArray(episode.tracks) ? episode.tracks : [];
    const perLang = tracks.some((t) => t && t.existIndividualVideo === true);

    const streams: Stream[] = [];
    const seen = new Set<string>();

    async function tryOne(langId: string | null, langName: string, res: string) {
      try {
        const envV = await apiVideoUrl(movieId, epId, res, langId, providerContext, signal);
        const v    = envV?.data?.data ?? envV?.data ?? {};
        const url  = v.videoUrl;
        if (!url || v.permissionDenied === true) return;
        if (seen.has(url)) return;
        seen.add(url);

        const parts = [title];
        if (langName) parts.push(langName);
        if (QUALITY_NAME[res]) parts.push(QUALITY_NAME[res]);
        if (/preview/i.test(url)) parts.push("preview");

        streams.push({
          server:  parts.join(" - "),
          link:    url,
          type:    /\.m3u8(\?|#|$)/i.test(url) ? "m3u8" : "mp4",
          quality: String(QUALITY_NUM[res] || res || "720"),
        });
      } catch {
        /* try next */
      }
    }

    if (!perLang) {
      const langName =
        tracks
          .map((t) => t && (t.languageName || t.abbreviate))
          .filter(Boolean)
          .join(", ") || "Default";
      for (const res of RESOLUTIONS) await tryOne(null, langName, res);
    } else {
      for (const t of tracks) {
        if (!t || t.languageId == null) continue;
        const lname = t.languageName || t.abbreviate || "Unknown";
        for (const res of RESOLUTIONS) await tryOne(String(t.languageId), lname, res);
      }
    }

    return streams;
  } catch (err) {
    console.error("CastleTV getStream error:", err);
    return [];
  }
}
