import { getPage } from "./request";
import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;
  try {
    // Decode only the actual wrapper parameter, without swallowing trailing params.
    const wrapped = new URL(url).searchParams.get('url');
    if (wrapped) {
      const decoded = /^https?:\/\//i.test(wrapped) ? wrapped : atob(wrapped);
      if (!/^https?:\/\//i.test(decoded)) throw new Error('Invalid episode-list redirect');
      url = decoded;
    }
    let res = await getPage(url, providerContext);
    let currentUrl = res.url || url;
    let $ = cheerio.load(res.data);
    const seen = new Set<string>([currentUrl]);
    for (let i = 0; i < 3; i++) {
      const refresh = $("meta[http-equiv]").filter((_, el) => ($(el).attr('http-equiv') || '').toLowerCase() === 'refresh').first().attr('content');
      const match = refresh?.match(/url\s*=\s*['"]?([^'";]+)['"]?/i);
      if (!match) break;
      const next = new URL(match[1].trim(), currentUrl).href;
      if (seen.has(next)) throw new Error('Episode-list redirect loop');
      seen.add(next);
      res = await getPage(next, providerContext, undefined, {Referer: currentUrl});
      currentUrl = res.url || next;
      $ = cheerio.load(res.data);
    }
    const episodeLinks: EpisodeLink[] = [];
    $("h3,h4").map((i, element) => {
      const seriesTitle = $(element).text();
      const episodesLink = $(element).find("a").attr("href");
      if (episodesLink && episodesLink !== "#") {
        episodeLinks.push({
          title: seriesTitle.trim() || "No title found",
          link: new URL(episodesLink, currentUrl).href,
        });
      }
    });
    $("a.maxbutton").map((i, element) => {
      const seriesTitle = $(element).children("span").text();
      const episodesLink = $(element).attr("href");
      if (episodesLink && episodesLink !== "#") {
        episodeLinks.push({
          title: seriesTitle.trim() || "No title found",
          link: new URL(episodesLink, currentUrl).href,
        });
      }
    });
    return episodeLinks;
  } catch (err) {
    throwProviderError("MoviesMod", "episodes", err);
  }
};
