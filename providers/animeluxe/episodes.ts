import { ProviderContext } from "../types";

export interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(url, { headers: commonHeaders })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const episodes: EpisodeLink[] = [];

      $(".episodes-list li a[href]").each((_, el) => {
        const a = $(el);
        let link = a.attr("href") || "";

        // ✅ Decode URL
        try {
          link = decodeURIComponent(link);
        } catch (e) {
          // fallback if decoding fails
        }

        // ✅ Complete URL if relative
        if (link.startsWith("//")) link = "https:" + link;
        if (!link.startsWith("http")) link = new URL(link, url).href;

        // ✅ Remove <i> icon from text for title
        const title = a.clone().children("i").remove().end().text().trim();

        episodes.push({ title, link });
      });

      return episodes;
    })
    .catch((err: any) => {
      console.error("AnimeLuxe episodes error:", err?.message || err);
      return [];
    });
};
