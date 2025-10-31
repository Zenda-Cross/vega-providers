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

    // 🔹 Episode parsing (sirf GDFlix aur V-Cloud ke links)
    container.find("h4").each((index, element) => {
      const el = $(element);
      const title = el.text().replace(/-/g, "").replace(/:/g, "").trim();

      const link =
        el
          .next("p")
          .find('a[href*="gdflix"], a[href*="vcloud"]')
          .attr("href") || "";

      if (title && link) {
        episodes.push({ title, link });
      }
    });

    // 🔹 Agar koi episode nahi mila (series single GDFlix/VCloud link hai)
    if (episodes.length === 0) {
      const singleLink =
        container.find('a[href*="gdflix"], a[href*="vcloud"]').attr("href") || "";

      if (singleLink) {
        episodes.push({
          title: "Play Now",
          link: singleLink,
        });
      }
    }

    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error:", err);
    return [];
  }
};
