import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import { getCinemetaMeta } from "../getCinemetaMeta";
import { enrichEpisodes, readEpisodeContext } from "./cinemeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);
  try {
    const context = readEpisodeContext(url);
    const res = await axios.get(context.requestUrl, {
      headers: {
        ...headers,
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=6yZYfXQxBgjaD1eacR5zZCz7njssbxjtSZZCElTOGk0-1764836255-1.2.1.1-bzHvDcDRLp6AAYo7qvGVzJ6Gk6zaqAepuGiGhAWCGYL.ZDpw5yI4TkUIXDgAnEhGCZ9J5X2_OagzgeMHZrd8rzeyAFQXj0dmYMErcfII7_Rhq5kZ4kAtS0tl9PtaNKKd2m4taIufySXCCstl3iNLMODTjbsW_KZi8U8DauOdGSAhBd1DCGxvLlAOM.snfkhb0yQiVJcLW8Bv9IeKQac0ar_TKkV6QexqNZYiyRXnE7E; xla=s4t",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
      },
    });
    const $ = cheerio.load(res.data);
    const container = $(".entry-content,.entry-inner");
    $(".unili-content,.code-block-1").remove();
    const episodes: EpisodeLink[] = [];
    container.find("h3, h4, h5, p").each((index, element) => {
      const el = $(element);
      const text = el.text().trim();
      if (/episodes?\s*[:\d\-]/i.test(text) || /e\d{1,3}\b/i.test(text) || /^episode\s*\d+/i.test(text)) {
        const title = text
          .replace(/\s+/g, " ")
          .trim()
          .replace(/^[-:\s]+|[-:\s]+$/g, "")
          .replace(/^episodes?\s*:\s*/i, "Episode ");

        let nextP = el.next();
        while (nextP.length && !nextP.is("p") && !nextP.find("a[href]").length) {
          nextP = nextP.next();
        }

        const link =
          nextP.find("a[href*='vcloud']").attr("href") ||
          nextP.find("a[href*='hubcloud']").attr("href") ||
          nextP.find("a[href*='fastdl']").attr("href") ||
          nextP.find(".btn-outline").parent().attr("href") ||
          nextP.find(".btn-outline").attr("href") ||
          nextP.find("a[href]").first().attr("href");

        if (title && link && !episodes.some((e) => e.title === title)) {
          episodes.push({ title, link });
        }
      }
    });
    const quickDownload = await providerContext.kvStore?.get<boolean>("vega_quickDownload");
    const skipTimings = await providerContext.kvStore?.get<boolean>("vega_skipTimings");

    if (!context.imdbId || !context.season) {
      return episodes.map((e) => ({
        ...e,
        quickDownload: quickDownload ?? true,
      }));
    }

    const cinemeta = await getCinemetaMeta(
      context.imdbId,
      "series",
      providerContext,
    );
    let enriched = enrichEpisodes(episodes, cinemeta.videos || [], context.season);

    if (skipTimings ?? true) {
      enriched = await enrichEpisodesWithSkipTimings(
        enriched,
        context.imdbId,
        context.season,
        providerContext,
      );
    }

    return enriched.map((e) => ({
      ...e,
      quickDownload: quickDownload ?? true,
    }));
  } catch (err) {
    throwProviderError("Vega", "episodes", err);
  }
};
