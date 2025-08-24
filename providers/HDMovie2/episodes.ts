// providers/HDMovie2/episodes.ts
import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const base = "https://hdmovie2.africa";
    const res = await axios.get(url, { headers: commonHeaders });
    const $ = cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    $(".episodios li, .episode-list li, .episodes li").each((i, el) => {
      const $el = $(el);
      let link = $el.find("a").attr("href") || "";
      const title = $el.find("a").text().trim() || `Episode ${i + 1}`;
      if (!link) return;
      if (link.startsWith("/")) link = base + link;
      episodes.push({ title, link });
    });

    return episodes;
  } catch (err) {
    console.error("HDMovie2 getEpisodes error:", err);
    return [];
  }
};

