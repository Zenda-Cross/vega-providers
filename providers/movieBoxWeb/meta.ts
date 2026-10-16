import { Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import {
  absoluteUrl,
  detailPath,
  encodeLink,
  getProviderBaseUrl,
  MovieBoxDub,
  MovieBoxResource,
  MovieBoxSubject,
  parseNuxtDetail,
} from "./utils";

function buildPlaybackLink(
  subject: MovieBoxSubject,
  dub: MovieBoxDub,
  seasons: MovieBoxResource["seasons"],
): string {
  const isSeries = subject.subjectType === 2;
  const movieSeason =
    seasons?.find((season) => season.se === 0) || seasons?.[0];
  const firstSeriesSeason =
    seasons?.find((season) => (season.se || 0) > 0) || seasons?.[0];
  const movieResolution = movieSeason?.resolutions
    ?.filter((item) => (item.epNum || 0) >= 1)
    .sort((a, b) => (b.resolution || 0) - (a.resolution || 0))[0]?.resolution;
  const targetSubjectId = dub.subjectId || subject.subjectId || "";
  const targetDetailPath = dub.detailPath || subject.detailPath || "";

  const alternateDub =
    subject.dubs?.find(
      (d) =>
        d.subjectId &&
        d.subjectId !== targetSubjectId &&
        (d.original ||
          d.lanName?.toLowerCase().includes("original") ||
          d.lanCode === "en"),
    ) ||
    subject.dubs?.find((d) => d.subjectId && d.subjectId !== targetSubjectId);

  const fallbackSubjectId =
    subject.subjectId && subject.subjectId !== targetSubjectId
      ? subject.subjectId
      : alternateDub?.subjectId;
  const fallbackDetailPath =
    subject.detailPath && subject.detailPath !== targetDetailPath
      ? subject.detailPath
      : alternateDub?.detailPath;

  return encodeLink({
    subjectId: targetSubjectId,
    detailPath: targetDetailPath,
    fallbackSubjectId,
    fallbackDetailPath,
    language: dub.lanName || dub.lanCode || "Original",
    season: isSeries ? (firstSeriesSeason?.se || 1) : (movieSeason?.se || 0),
    episode: 1,
    resolution: isSeries ? undefined : movieResolution,
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
    const baseUrl = await getProviderBaseUrl();
    const pageUrl = absoluteUrl(baseUrl, `/moviesDetail/${detailPath(link)}`);
    const response = await fetch(pageUrl);
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} | URL ${pageUrl}`,
      );
    }

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
    throwProviderError("MovieBox Web", "metadata", error);
  }
};
