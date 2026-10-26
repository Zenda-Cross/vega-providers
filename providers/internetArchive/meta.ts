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

  const linkList: Link[] = [
    {
      title: isSeries ? title : "Movie",
      directLinks: isSeries
        ? groups.map((original) => ({
            title: episodeTitle(original),
            link: `${identifier}/${original}`,
            type: "series" as const,
          }))
        : [{ title: "Movie", link: identifier, type: "movie" as const }],
    },
  ];

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
