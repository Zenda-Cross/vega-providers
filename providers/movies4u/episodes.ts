import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);

  try {
    const res = await axios.get(url, {
      headers: {
        ...headers,
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
      },
    });

    const $ = cheerio.load(res.data);

    const episodes: EpisodeLink[] = [];

    $("h4, h5").each((i, el) => {
      const title = $(el).text().trim();
      if (!title) return;

      const cleanedTitle = title.replace(/[-:]/g, "").trim();

      // V-Cloud link
      const vcloudLink = $(el)
        .next("p")
        .find('a[href*="vcloud.zip"]')
        .attr("href");

      // H-Cloud link (hubcloud / cloud / hubcloud.foo)
      const hcloudLink = $(el)
        .next("p")
        .find('a[href*="hubcloud"], a[href*="cloud"], a[href*="hubcloud.foo"]')
        .attr("href");

      if (vcloudLink || hcloudLink) {
        episodes.push({
  title: cleanedTitle,
  link: (vcloudLink || hcloudLink)!,
});

      }
    });

    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error:", err);
    return [];
  }
};
