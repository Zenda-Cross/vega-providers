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

    $("h4.fittexted_for_content_h4").each((_, h4El) => {
      const epTitle = $(h4El).text().trim();
      if (!epTitle) return;

      // Next until next <h4> or <hr> ke andar saare <a> links
      $(h4El)
        .nextUntil("h4, hr")
        .find("a[href]") // sirf <a> tags
        .each((_, linkEl) => {
          let href = ($(linkEl).attr("href") || "").trim();
          if (!href) return;
          if (!href.startsWith("http")) href = new URL(href, url).href;

          const btnText = $(linkEl).text().trim() || "Watch Episode";

          // --- Sirf SkyDrop links include karo
          const lowerHref = href.toLowerCase();
          if (lowerHref.includes("skydro") || lowerHref.includes("flexplayer.buzz")) {
            episodes.push({
              title: `${epTitle} - ${btnText}`,
              link: href,
            });
          }
        });
    });

    // --- Sort by episode number extracted from title
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
