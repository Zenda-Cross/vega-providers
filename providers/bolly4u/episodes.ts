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

    // --- Har <h3> ke andar ya just after <hr> me <a> tags ke links ko pick karo
    $("h3").each((_, h3El) => {
      // h3 ke andar direct <a> tag
      const aTag = $(h3El).find("a[href]");
      if (aTag.length) {
        aTag.each((_, aEl) => {
          const rawHref = $(aEl).attr("href");
          if (!rawHref) return;
          let href = rawHref.trim();
          if (!href) return;
          if (!href.startsWith("http")) href = new URL(href, url).href;

          const title = $(aEl).text()?.trim() || "Episode";
          episodes.push({ title, link: href });
        });
      }
    });

    // --- Optional: sort by episode number
    episodes.sort((a, b) => {
      const numA = parseInt(a.title.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.title.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
}

// --- Wrapper function
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}
