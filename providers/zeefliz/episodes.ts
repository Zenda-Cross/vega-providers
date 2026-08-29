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
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);
  try {
    const context = readCinemetaContext(url);
    const res = await axios.get(context.requestUrl, {
      headers: {
        ...headers,
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
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
    const quickDownload = await providerContext.kvStore?.get<boolean>("zeefliz_quickDownload");
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
    let enriched = enrichCinemetaEpisodes(
      episodes,
      cinemeta.videos || [],
      context.season,
    );
    const skipTimings = await providerContext.kvStore?.get<boolean>("zeefliz_skipTimings");
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
    throwProviderError("ZeeFliz", "episodes", err);
  }
};
