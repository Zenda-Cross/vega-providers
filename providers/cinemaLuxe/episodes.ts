import { EpisodeLink, ProviderContext } from "../types";

export async function getEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const res = await providerContext.axios.get(url);
    const $ = providerContext.cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    let episodeCounter = 1; // Episode numbering start

    // ✅ Sirf V-Cloud episodes
    $("a").each((_, aEl) => {
      const href = ($(aEl).attr("href") || "").trim();

      // V-Cloud link check
      if (href.includes("vcloud.lol")) {
        const btnText = `Episode ${episodeCounter}`; // Episode number assign
        episodes.push({
          title: btnText,
          link: href,
        });
        episodeCounter++; // Counter increment
      }
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
}

// --- System wrapper
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}
