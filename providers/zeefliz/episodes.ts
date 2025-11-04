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
    const container = $(".entry-content,.entry-inner");
    $(".unili-content,.code-block-1").remove();

    const episodes: EpisodeLink[] = [];

    container.find("h4").each((index, element) => {
      const el = $(element);
      const title = el.text().replace(/-/g, "").replace(/:/g, "").trim();

      // ✅ Primary link (Zee Cloud - Resumable)
      const zeeCloudLink = el
        .next("p")
        .find(
          '.btn-outline[style="background:linear-gradient(135deg,#ed0b0b,#f2d152); color: white;"]'
        )
        .parent()
        .attr("href");

      // ✅ Alternate / backup link (G-Direct)
      const gDirectLink = el
        .next("p")
        .find(
          '.btn-outline[style="background:linear-gradient(135deg,#0ebac3,#09d261); color: white;"]'
        )
        .parent()
        .attr("href");

      // ✅ Push Zee Cloud link if exists
      if (title && zeeCloudLink) {
        episodes.push({
          title: `${title}`,
          link: zeeCloudLink,
        });
      }

      // ✅ Also push G-Direct link if exists (without removing anything)
      if (title && gDirectLink) {
        episodes.push({
          title: `${title}`,
          link: gDirectLink,
        });
      }
    });

    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error: ");
    return [];
  }
};
