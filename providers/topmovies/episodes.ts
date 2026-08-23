import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import {
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  readCinemetaContext,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;
  try {
    const context = readCinemetaContext(url);
    let requestUrl = context.requestUrl;
    const hasEncodedUrl = requestUrl.includes("url=");
    if (hasEncodedUrl) {
      requestUrl = atob(requestUrl.split("url=")[1]);
    }
    const res = await axios.get(requestUrl);
    const html = res.data;
    let $ = cheerio.load(html);
    if (hasEncodedUrl) {
      const newUrl = $("meta[http-equiv='refresh']")
        .attr("content")
        ?.split("url=")[1];
      const res2 = await axios.get(newUrl || requestUrl);
      const html2 = res2.data;
      $ = cheerio.load(html2);
    }
    const episodeLinks: EpisodeLink[] = [];
    $("h3,h4").map((i, element) => {
      const seriesTitle = $(element).text();
      const episodesLink = $(element).find("a").attr("href");
      if (episodesLink && episodesLink !== "#") {
        episodeLinks.push({
          title: seriesTitle.trim() || "No title found",
          link: episodesLink || "",
        });
      }
    });
    $("a.maxbutton").map((i, element) => {
      const seriesTitle = $(element).children("span").text();
      const episodesLink = $(element).attr("href");
      if (episodesLink && episodesLink !== "#") {
        episodeLinks.push({
          title: seriesTitle.trim() || "No title found",
          link: episodesLink || "",
        });
      }
    });
    if (!context.imdbId || !context.season) return episodeLinks;

    const cinemeta = await getCinemetaMeta(
      context.imdbId,
      "series",
      providerContext,
    );
    let enriched = enrichCinemetaEpisodes(
      episodeLinks,
      cinemeta.videos || [],
      context.season,
    );
    const skipTimings = await providerContext.kvStore?.get<boolean>("topmovies_skipTimings");
    if (skipTimings ?? true) {
      enriched = await enrichEpisodesWithSkipTimings(
        enriched,
        context.imdbId,
        context.season,
        providerContext,
      );
    }
    return enriched;
  } catch (err) {
    throwProviderError("TopMovies", "episodes", err);
  }
};
