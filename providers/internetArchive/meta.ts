import { Info, Link, ProviderContext } from "../types";
import {
  fetchItem,
  firstValue,
  groupVideos,
  imageUrl,
  isEpisodeList,
  parseLink,
  IA_BASE,
} from "./api";

const toPlainText = (html: string, providerContext: ProviderContext): string => {
  if (!html) return "";
  const $ = providerContext.cheerio.load(`<div>${html.replace(/<br\s*\/?>/gi, "\n")}</div>`);
  return $("div").text().replace(/\n{3,}/g, "\n\n").trim();
};

// Turns "Bonanza s01e19.mp4" into "Bonanza s01e19".
const episodeTitle = (fileName: string): string =>
  fileName.replace(/^.*\//, "").replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();

const episodeNumbers = (fileName: string): { season: number; episode: number } => {
  const name = fileName.replace(/^.*\//, "");
  const match = name.match(/s(\d{1,2})[\s._-]*e(\d{1,3})/i) || name.match(/\b(\d{1,2})x(\d{2,3})\b/i);
  if (match) return { season: Number(match[1]), episode: Number(match[2]) };
  const episode = name.match(/\bep(?:isode)?[\s._-]*(\d+)/i);
  return { season: 1, episode: episode ? Number(episode[1]) : Number.MAX_SAFE_INTEGER };
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { identifier } = parseLink(link);
  const { metadata, files } = await fetchItem(identifier, providerContext);

  const title = firstValue(metadata.title) || identifier;
  const year = firstValue(metadata.year) || firstValue(metadata.date).slice(0, 4);
  const subjects: string[] = (
    Array.isArray(metadata.subject) ? metadata.subject : [firstValue(metadata.subject)]
  )
    .flatMap((s: string) => String(s).split(";"))
    .map((s: string) => s.trim())
    .filter(Boolean);
  const imdbId =
    JSON.stringify([metadata["external-identifier"], metadata.imdb]).match(/tt\d{7,}/)?.[0] || "";

  const groups = [...groupVideos(files).keys()];
  const isSeries = isEpisodeList(groups, metadata);

  const linkList: Link[] = [];
  if (isSeries) {
    const seasons = new Map<number, string[]>();
    for (const original of groups) {
      const { season } = episodeNumbers(original);
      const episodes = seasons.get(season) || [];
      episodes.push(original);
      seasons.set(season, episodes);
    }
    for (const [season, episodes] of [...seasons.entries()].sort(([a], [b]) => a - b)) {
      linkList.push({
        title: `Season ${season}`,
        directLinks: episodes
          .sort((a, b) => episodeNumbers(a).episode - episodeNumbers(b).episode || a.localeCompare(b, undefined, { numeric: true }))
          .map((original) => ({
            title: episodeTitle(original),
            link: `${encodeURIComponent(identifier)}/${original.split("/").map(encodeURIComponent).join("/")}`,
            type: "series" as const,
          })),
      });
    }
  } else {
    linkList.push({ title: "Movie", directLinks: [{ title: "Movie", link: encodeURIComponent(identifier), type: "movie" }] });
  }

  return {
    title,
    synopsis: toPlainText(firstValue(metadata.description), providerContext),
    image: imageUrl(identifier),
    imdbId,
    type: isSeries ? "series" : "movie",
    tags: [year, ...subjects].filter(Boolean).slice(0, 6),
    linkList,
    webUrl: `${IA_BASE}/details/${encodeURIComponent(identifier)}`,
  };
};
