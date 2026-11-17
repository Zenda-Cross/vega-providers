import { throwProviderError } from "../providerErrors";
import { Info, Link, ProviderContext } from "../types";
import {
  buildAnimeUrl,
  callServerFn,
  cleanSynopsis,
  extractMediaBackdrop,
  extractMediaPoster,
  extractMediaTitle,
  mapEpisodesToLinks,
  parseAnimeId,
  resolveBaseUrl,
  SERVER_FNS,
} from "./client";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  provider: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const baseUrl = await resolveBaseUrl();
    const animeId = parseAnimeId(link);
    const referer = buildAnimeUrl(baseUrl, animeId);

    const [info, episodes, logoRes] = await Promise.all([
      callServerFn<any>(
        SERVER_FNS.INFO,
        { id: animeId, type: "ANIME", watchOrder: true },
        { providerContext, baseUrl, referer },
      ),
      callServerFn<any[]>(
        SERVER_FNS.EPISODES,
        { id: animeId },
        { providerContext, baseUrl, referer },
      ).catch(() => []),
      callServerFn<{ logo?: string | null } | null>(
        SERVER_FNS.LOGO,
        { id: animeId, type: "ANIME", lang: "en" },
        { providerContext, baseUrl, referer },
      ).catch(() => null),
    ]);

    if (!info || !info.id) {
      throw new Error(`Anime ${animeId} not found`);
    }

    const title = extractMediaTitle(info.title) || `Anime ${animeId}`;
    const isMovie = info.format === "MOVIE";
    const poster = extractMediaPoster(info) || undefined;
    const image = extractMediaBackdrop(info) || poster || "";
    const rawLogo =
      (typeof info.logo_image === "string" && info.logo_image.trim()) ||
      (typeof logoRes?.logo === "string" && logoRes.logo.trim()) ||
      "";
    const logo = rawLogo || undefined;
    const synopsis = cleanSynopsis(info.description);
    const rating =
      typeof info.average_score === "number" && info.average_score > 0
        ? (info.average_score / 10).toFixed(1)
        : undefined;

    const tags = [
      info.format,
      info.status,
      ...(Array.isArray(info.genres) ? info.genres : []),
    ]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    const directLinks = mapEpisodesToLinks(episodes || [], {
      baseUrl,
      animeId,
      isMovie,
    });

    const linkList: Link[] = [];
    const watchOrder = Array.isArray(info.watch_order)
      ? info.watch_order.filter(
          (item: any) =>
            item &&
            item.type === "ANIME" &&
            Number.isFinite(Number(item.id)) &&
            (Number(item.episodes_aired || 0) > 0 || Number(item.id) === animeId),
        )
      : [];

    if (watchOrder.length > 1) {
      const seenSeasonIds = new Set<number>();
      for (const entry of watchOrder) {
        const entryId = Number(entry.id);
        if (seenSeasonIds.has(entryId)) continue;
        seenSeasonIds.add(entryId);

        const seasonTitle =
          entry.label || extractMediaTitle(entry.title) || `Part ${entryId}`;

        if (entryId === animeId) {
          if (directLinks.length > 0) {
            linkList.push({
              title: seasonTitle,
              directLinks,
            });
          }
        } else {
          linkList.push({
            title: seasonTitle,
            episodesLink: buildAnimeUrl(baseUrl, entryId),
          });
        }
      }
    }

    if (linkList.length === 0 && directLinks.length > 0) {
      linkList.push({
        title,
        directLinks,
      });
    }

    return {
      title,
      image,
      poster,
      logo,
      synopsis,
      imdbId: "",
      tmdbId: info.tmdb_id ? String(info.tmdb_id) : undefined,
      type: isMovie ? "movie" : "series",
      tags: tags.length > 0 ? tags : undefined,
      rating,
      linkList,
      webUrl: referer,
    };
  } catch (err) {
    throwProviderError("AniDream", "metadata", err);
  }
};
