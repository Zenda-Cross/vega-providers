import { getBaseUrl } from "../getBaseUrl";
import { Info, Link, ProviderContext } from "../types";
import {
  absoluteUrl,
  detailPath,
  encodeLink,
  MovieBoxDub,
  MovieBoxResource,
  MovieBoxSubject,
  parseNuxtDetail,
  providerValue,
} from "./utils";

function buildPlaybackLink(
  subject: MovieBoxSubject,
  dub: MovieBoxDub,
  seasons: MovieBoxResource["seasons"],
): string {
  const movieSeason =
    seasons?.find((season) => season.se === 0) || seasons?.[0];
  const movieResolution = movieSeason?.resolutions
    ?.filter((item) => (item.epNum || 0) >= 1)
    .sort((a, b) => (b.resolution || 0) - (a.resolution || 0))[0]?.resolution;
  return encodeLink({
    subjectId: dub.subjectId || subject.subjectId || "",
    detailPath: dub.detailPath || subject.detailPath || "",
    language: dub.lanName || dub.lanCode || "Original",
    season: subject.subjectType === 2 ? undefined : movieSeason?.se || 0,
    episode: subject.subjectType === 2 ? undefined : 1,
    resolution: subject.subjectType === 2 ? undefined : movieResolution,
    seasons,
  });
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const baseUrl = await getBaseUrl(providerValue);
    const pageUrl = absoluteUrl(baseUrl, `/moviesDetail/${detailPath(link)}`);
    const response = await fetch(pageUrl);
    if (!response.ok)
      throw new Error(`MovieBox Web returned ${response.status}`);

    const detail = parseNuxtDetail(
      await response.text(),
      providerContext.cheerio,
    );
    if (!detail) throw new Error("MovieBox Web detail data was not found");

    const { subject, resource } = detail;
    const isSeries = subject.subjectType === 2;
    const dubs = subject.dubs?.length
      ? subject.dubs
      : [
          {
            subjectId: subject.subjectId,
            detailPath: subject.detailPath,
            lanName: "Original",
          },
        ];
    const linkList: Link[] = (subject.hasResource === false ? [] : dubs)
      .filter((dub) => dub.subjectId && (dub.detailPath || subject.detailPath))
      .map((dub) => {
        const playbackLink = buildPlaybackLink(subject, dub, resource.seasons);
        if (isSeries) {
          return {
            title: dub.lanName || dub.lanCode || "Original",
            episodesLink: playbackLink,
          };
        }
        return {
          title: dub.lanName || dub.lanCode || "Original",
          directLinks: [
            {
              title: dub.lanName || dub.lanCode || "Original",
              link: playbackLink,
              type: "movie",
            },
          ],
        };
      });

    const tags = [
      subject.countryName,
      subject.releaseDate?.slice(0, 4),
      ...(subject.genre || "").split(",").map((tag) => tag.trim()),
    ].filter((tag): tag is string => Boolean(tag));

    return {
      title: subject.title || "",
      image: subject.cover?.url || "",
      synopsis: subject.description || "",
      imdbId: "",
      type: isSeries ? "series" : "movie",
      tags,
      cast: subject.stars?.map((star) => star.name || "").filter(Boolean),
      rating: subject.imdbRatingValue || "",
      linkList,
      webUrl: pageUrl,
    };
  } catch (error) {
    console.error("MovieBox Web metadata error", error);
    return {
      title: "",
      image: "",
      synopsis: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
