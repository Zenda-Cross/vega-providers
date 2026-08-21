import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import {
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  readCinemetaContext,
} from "../getCinemetaMeta";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio } = providerContext;
    const context = readCinemetaContext(url);
    const res = await axios.get(context.requestUrl, { headers });
    const $ = cheerio.load(res.data);
    const episodes: EpisodeLink[] = [];

    let epCount = 1;
    $("a.dl-btn").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        episodes.push({
          title: `Episode ${epCount}`,
          link: href,
        });
        epCount++;
      }
    });

    const quickDownload = await providerContext.kvStore?.get<boolean>("quickDownload");
    if (!context.imdbId || !context.season) {
      return episodes.map((e) => ({
        ...e,
        quickDownload: Boolean(quickDownload),
      }));
    }

    const cinemeta = await getCinemetaMeta(
      context.imdbId,
      "series",
      providerContext,
    );
    const enriched = await enrichCinemetaEpisodes(
      episodes,
      cinemeta.videos || [],
      context.season,
    );
    return enriched.map((e) => ({
      ...e,
      quickDownload: Boolean(quickDownload),
    }));
  } catch (err) {
    throwProviderError("KMMovies", "episodes", err);
  }
};
