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

    // ZinkMovies / ZinkCloud style episode links
    $(".entry-content a.maxbutton-download-now[href]").each((_, el) => {
      let href = ($(el).attr("href") || "").trim();
      const text = ($(el).find(".mb-text").text() || $(el).text()).trim();
      if (!href) return;
      if (!href.startsWith("http")) href = new URL(href, url).href;

      episodes.push({
        title: text, // EPISODE - 01 (size) ya All Episodes Zip
        link: href,
      });
    });

    return episodes;
  } catch (err) {
    console.error("ZinkMovies getEpisodeLinks error:", err);
    return [];
  }
}

// System wrapper
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}
