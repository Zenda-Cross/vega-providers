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

    $("h4").each((_, h4El) => {
      const epTitle = $(h4El).text().trim();
      if (!epTitle) return;

      // GDFlix aur V-Cloud link hi collect karenge
      $(h4El)
        .nextUntil("h4, hr")
        .find("a[href]")
        .each((_, linkEl) => {
          let href = ($(linkEl).attr("href") || "").trim();
          if (!href) return;
          if (!href.startsWith("http")) href = new URL(href, url).href;

          const btnText = $(linkEl).text().trim() || "Watch Episode";

          // Sirf GDFlix ya V-Cloud wale links add kare
          if (
            href.toLowerCase().includes("gdlink") ||
            href.toLowerCase().includes("gdflix") ||
            href.toLowerCase().includes("vcloud.lol")
          ) {
            episodes.push({
              title: `${epTitle} - ${btnText}`,
              link: href,
            });
          }
        });
    });

    return episodes;
  } catch (err) {
    console.error("vgmlinks getEpisodeLinks error:", err);
    return [];
  }
}

// Wrapper (system requires getEpisodes)
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}
