import { Info, Link, ProviderContext } from "../types";
import {
  findImdbId,
  getJson,
  isBlankTitle,
  makeRef,
  parseRef,
  readCast,
  readList,
  titleFor,
} from "./bridge";

/** Above this many episodes the season is loaded on demand via episodes.ts. */
const DIRECT_LINK_LIMIT = 60;

function episodeLabel(video: any, index: number): string {
  const episode = Number(video?.episode);
  const number = Number.isFinite(episode) && episode > 0 ? episode : index + 1;
  const name = String(video?.title || "").trim();
  return `E${number}${name ? " " + name : ""}`;
}

export const getMeta = async function ({
  link,
  providerContext,
  signal,
}: {
  link: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<Info> {
  const { type, id } = parseRef(link);
  if (!id) throw new Error("CNCVerse: invalid title link");
  let meta: any = null;
  try {
    meta = (await getJson(providerContext, `/meta/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`, signal, 45000))?.meta;
  } catch {
    meta = null;
  }
  const remembered = await titleFor(providerContext, id);
  if (!meta && !remembered?.n) throw new Error("CNCVerse: this title is no longer available on the bridge");

  const videos: any[] = (Array.isArray(meta?.videos) ? meta.videos : []).filter(
    (video: any) => video && typeof video.id === "string" && video.id,
  );
  const live = type === "tv";
  const title = meta && !isBlankTitle(meta.name) ? String(meta.name) : remembered?.n || "Unknown title";
  const poster = String(meta?.poster || remembered?.p || "");
  const image = String(meta?.background || poster || "");
  const genres = readList(meta?.genres)
    .filter(genre => !/^[A-Z]{2}$/.test(genre))
    .slice(0, 8);

  let linkList: Link[];
  let infoType: string;

  if (live) {
    infoType = "movie";
    linkList = [
      {
        title: "Live TV",
        directLinks: [{ title: "Watch Live", link, type: "movie" }],
      },
    ];
  } else if (videos.length) {
    infoType = "series";
    const seasons = new Map<number, any[]>();
    for (const video of videos) {
      const season = Number(video.season);
      const key = Number.isFinite(season) && season > 0 ? season : 1;
      const bucket = seasons.get(key);
      if (bucket) bucket.push(video);
      else seasons.set(key, [video]);
    }
    const keys = Array.from(seasons.keys()).sort((a, b) => a - b);
    linkList = keys.map(season => {
      const episodes = seasons.get(season)!.slice().sort((a, b) => {
        const ea = Number(a.episode) || 0;
        const eb = Number(b.episode) || 0;
        return ea - eb;
      });
      const seasonTitle = `Season ${season}`;
      if (videos.length <= DIRECT_LINK_LIMIT) {
        return {
          title: seasonTitle,
          directLinks: episodes.map((video, index) => ({
            title: episodeLabel(video, index),
            link: makeRef(type, video.id),
            type: "series" as const,
          })),
        };
      }
      return { title: seasonTitle, episodesLink: `ep|${type}|${id}|${season}` };
    });
  } else {
    infoType = "movie";
    linkList = [
      {
        title: "Movie",
        directLinks: [{ title: "Play", link, type: "movie" }],
      },
    ];
  }

  const synopsis = String(meta?.description || "").trim() || (live ? `Watch ${title} live.` : "");

  return {
    title,
    image,
    poster,
    synopsis,
    imdbId: findImdbId(meta || {}, videos),
    type: infoType,
    tags: live ? ["Live TV", ...genres] : genres,
    cast: readCast(meta),
    rating: meta?.imdbRating ? String(meta.imdbRating) : undefined,
    linkList,
  };
};
