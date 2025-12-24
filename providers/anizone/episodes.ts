import { ProviderContext } from "../types";

interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(url, { headers: commonHeaders })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const episodes: EpisodeLink[] = [];

      // =====================================================
      // ✅ NEW EPISODE BUTTON SELECTOR
      // =====================================================
      $("a[wire\\:navigate]").each((_, el) => {
        const a = $(el);

        const href = a.attr("href");
        if (!href || !href.includes("/anime/")) return;

        const epNum = a.find("div.min-w-10").text().trim();
        const epTitle = a.find("div.grow").text().trim();

        if (!epNum) return;

        const title = epTitle
          ? `Episode ${epNum} - ${epTitle}`
          : `Episode ${epNum}`;

        const link = href.startsWith("http")
          ? href
          : new URL(href, url).href;

        episodes.push({ title, link });
      });

      return episodes;
    })
    .catch((err: any) => {
      console.error("AniZone episodes error:", err?.message || err);
      return [];
    });
};
