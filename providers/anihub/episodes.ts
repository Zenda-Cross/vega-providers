import { ProviderContext } from "../types";

interface EpisodeLink {
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
      const $ = cheerio.load(res.data);

      const episodePages: { index: number; link: string }[] = [];

      // =====================================================
      // ✅ CASE 1: SERIES (EPISODES LIST)
      // =====================================================
      $(".episodes-container .anime-blog").each((i, el) => {
        const card = $(el);
        const episodePage =
          card.find(".action-overlay a[href]").attr("href");

        if (episodePage) {
          episodePages.push({
            index: i + 1,
            link: episodePage,
          });
        }
      });

      if (episodePages.length > 0) {
        const iframePromises = episodePages.map((ep) => {
          return axios
            .get(ep.link, { headers: commonHeaders })
            .then((epRes: any) => {
              const ep$ = cheerio.load(epRes.data);

              const iframeSrc =
                ep$("#responsiveIframe").attr("src") ||
                ep$("iframe").first().attr("src");

              if (iframeSrc) {
                return {
                  title: `Episode ${ep.index}`,
                  link: iframeSrc,
                };
              }

              return null;
            })
            .catch(() => null);
        });

        return Promise.all(iframePromises).then((all) =>
          all.filter(Boolean) as EpisodeLink[]
        );
      }

      // =====================================================
      // ✅ CASE 2: MOVIE (DIRECT IFRAME)
      // =====================================================
      const iframeSrc =
        $("#responsiveIframe").attr("src") ||
        $("iframe").first().attr("src");

      if (iframeSrc) {
        return [
          {
            title: "Watch Now",
            link: iframeSrc,
          },
        ];
      }

      console.log("No episodes or movie iframe found:", url);
      return [];
    })
    .catch((err: any) => {
      console.log("getEpisodes error:", err);
      return [];
    });
};
