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

    $("a.episode-link").each((i: number, el: any) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr("href") || "";
      if (!link || !title) return;
      episodes.push({ title, link });
    });

    return episodes;
  } catch (err) {
    console.error("pikahd getEpisodeLinks error:", err);
    return [];
  }
}