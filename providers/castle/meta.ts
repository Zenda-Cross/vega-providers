import { Info, Link, ProviderContext } from "../types";
import { apiMovieDetails, parseMediaLink, pickDetails, SERIES_TYPES, seasonLink, playLink } from "./castleCore";

function yearFromTs(ts: any): number | undefined {
  if (!ts) return undefined;
  const n = Number(ts);
  if (!isFinite(n)) return undefined;
  try { return new Date(n).getFullYear(); } catch { return undefined; }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    const movieId = parseMediaLink(link);
    if (!movieId) return empty;

    const env     = await apiMovieDetails(movieId, providerContext);
    const details = pickDetails(env);
    if (!details || !details.title) return empty;

    const episodes: any[] = Array.isArray(details.episodes) ? details.episodes : [];
    const seasons:  any[] = Array.isArray(details.seasons)  ? details.seasons  : [];
    const isSeries =
      SERIES_TYPES.has(String(details.movieType)) ||
      episodes.length > 1 ||
      seasons.length  > 1;

    const info: Info = {
      title:     details.title || "Unknown Title",
      synopsis:  details.briefIntroduction || "",
      image:     details.coverVerticalImage || details.coverHorizontalImage || "",
      imdbId:    details.imdbId || details.imdb_id || "",
      type:      isSeries ? "series" : "movie",
      linkList:  [],
    };

    if (details.score) {
      info.rating = String(details.score);
    }
    (info as any).year = yearFromTs(details.publishTime);
    (info as any).banner = details.coverHorizontalImage;

    if (isSeries) {
      const seasonList: any[] = seasons.length
        ? seasons
        : [{ movieId: details.id ?? movieId, number: 1 }];

      const links: Link[] = [];
      for (const s of seasonList) {
        if (!s || !s.movieId) continue;
        const sNum = s.number ?? 1;
        links.push({
          title:        `Season ${sNum}`,
          episodesLink: seasonLink(s.movieId),
          directLinks:  [],
        });
      }
      if (!links.length) {
        links.push({
          title:        "Episodes",
          episodesLink: seasonLink(details.id ?? movieId),
          directLinks:  [],
        });
      }
      info.linkList = links;
    } else {
      const ep = episodes[0];
      if (!ep?.id) return info;
      info.linkList = [{
        title:       "Movie",
        directLinks: [{
          title: "Play",
          link:  playLink(details.id ?? movieId, ep.id),
          type:  "movie",
        }],
      }];
    }

    return info;
  } catch (err) {
    console.error("CastleTV getMeta error:", err);
    return empty;
  }
};
