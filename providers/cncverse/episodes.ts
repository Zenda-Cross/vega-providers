import { EpisodeLink, ProviderContext } from "../types";
import { getJson, makeRef } from "./bridge";

/**
 * Loads one season of a long-running show on demand.
 * `url` is `ep|<mediaType>|<metaId>|<season>` as built by meta.ts.
 */
export const getEpisodes = async function ({
  url,
  providerContext,
  signal,
}: {
  url: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<EpisodeLink[]> {
  const parts = String(url || "").split("|");
  if (parts.length < 4 || parts[0] !== "ep") throw new Error("CNCVerse: invalid season link");
  const type = parts[1];
  const id = parts[2];
  const season = Number(parts.slice(3).join("|")) || 1;
  const meta = (await getJson(providerContext, `/meta/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`, signal, 45000))?.meta;
  const videos: any[] = (Array.isArray(meta?.videos) ? meta.videos : []).filter(
    (video: any) => video && typeof video.id === "string" && video.id,
  );
  const episodes = videos
    .filter(video => (Number(video.season) || 1) === season)
    .sort((a, b) => (Number(a.episode) || 0) - (Number(b.episode) || 0));
  return episodes.map((video, index) => {
    const episode = Number(video.episode);
    const number = Number.isFinite(episode) && episode > 0 ? episode : index + 1;
    const name = String(video.title || "").trim();
    return {
      title: `E${number}${name ? " " + name : ""}`,
      link: makeRef(type, video.id),
      ...(typeof video.thumbnail === "string" && video.thumbnail ? { image: video.thumbnail } : {}),
    };
  });
};
