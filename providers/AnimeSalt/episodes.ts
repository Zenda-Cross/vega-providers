import { EpisodeLink, ProviderContext } from "../types";

interface IframeLink {
  title: string;
  link: string;
}

/**
 * ORIGINAL FUNCTION (MODIFIED): Fetch standard episodes and their iframe links, now including multi-language support from options-1.
 */
export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<IframeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodes: Starting two-step scrape for URL:", url);

  const defaultHeaders = {
    ...headers,
  };

  try {
    const res = await axios.get(url, { headers: defaultHeaders });
    const $ = cheerio.load(res.data);

    const episodePages: EpisodeLink[] = [];

    $("#episode_by_temp li").each((i, el) => {
      const article = $(el).find("article.episodes");
      const href = article.find("a.lnk-blk").attr("href");
      const rawTitle = article.find("h2.entry-title").text().trim();

      if (href && rawTitle) {
        const match = rawTitle.match(/(\d+)x(\d+)/);
        const episodeNumber = match ? match[2] : "N/A";
        const cleanedTitle = `Episode ${episodeNumber}`;

        episodePages.push({
          title: cleanedTitle,
          link: href,
        });
      }
    });

    const finalLinks: IframeLink[] = [];

    for (const episode of episodePages) {
      try {
        const episodeRes = await axios.get(episode.link, {
          headers: defaultHeaders,
        });
        const episode$ = cheerio.load(episodeRes.data);
        
        // --- 1. Extract the primary iframe (options-0) ---
        const primaryIframe = episode$("#options-0 iframe");
        const iframeSrc =
          primaryIframe.attr("data-src") || primaryIframe.attr("src");

        if (iframeSrc) {
          finalLinks.push({
            title: episode.title,
            link: iframeSrc,
          });
        }
        
        // --- 2. Extract links from the alternate video player (options-1) if present (NEW LOGIC) ---
        const altIframe = episode$("#options-1 iframe");
        if (altIframe.length > 0) {
            const altDataSrc = altIframe.attr("data-src");

            if (altDataSrc) {
                try {
                    // Decode Base64 encoded JSON string
                    const jsonPart = altDataSrc.split(',').length > 1 ? altDataSrc.split(',')[1] : altDataSrc;
                    const jsonString = Buffer.from(jsonPart, 'base64').toString('utf8');
                    const languageLinks = JSON.parse(jsonString);

                    if (Array.isArray(languageLinks)) {
                        for (const item of languageLinks) {
                            if (item.language && item.link) {
                                // Add link with language appended to the title
                                finalLinks.push({
                                    title: `${episode.title} (${item.language})`,
                                    link: item.link,
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing multi-language links for ${episode.title}:`, e);
                }
            }
        }
        // --- END NEW LOGIC ---

      } catch (innerErr) {
        console.log(`Error scraping individual episode page ${episode.link}:`, innerErr);
      }
    }

    // EXTRA — merge iframe-only episodes
    const iframeExtra = await getIframeEpisodes({ url, providerContext });

    return [...finalLinks, ...iframeExtra];
  } catch (err) {
    console.log("getEpisodes error (main page scrape):", err);
    return [];
  }
};

/**
 * EXTRA FUNCTION: Detect standalone iframe-based episodes (UNCHANGED)
 */
export const getIframeEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<IframeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data);

    const iframeEpisodes: IframeLink[] = [];

    $("section.video-player iframe").each((i, el) => {
      const src = $(el).attr("data-src") || $(el).attr("src");

      if (src) {
        iframeEpisodes.push({
          title: "Play",
          link: src,
        });
      }
    });

    return iframeEpisodes;
  } catch (err) {
    console.log("Error in getIframeEpisodes:", err);
    return [];
  }
};