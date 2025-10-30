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

    // अब हर Episode ब्लॉक को पकड़ो जो -:Episodes: या Episode शब्द रखता हो
    $("h4:contains('Episode'), h4:contains('Episodes')").each((_, el) => {
      const episodeTitle = $(el).text().trim();

      // Episode number निकालना
      const episodeNumberMatch = episodeTitle.match(/\d+/);
      const episodeNumber = episodeNumberMatch ? episodeNumberMatch[0] : "";

      // इसके नीचे वाले <p> में सारे links
      const nextLinks = $(el).next("p").find("a");

      nextLinks.each((__, linkEl) => {
        const btn = $(linkEl);
        const link = btn.attr("href") || "";
        const btnText = btn.text().trim();

        // सिर्फ Zee-Cloud [Resumable] वाले लिंक
        if (/zcloud\.lol/i.test(link) || /Zee-Cloud/i.test(btnText)) {
          episodes.push({
            title: `Episode ${episodeNumber || ""}`.trim(),
            link: link,
          });
        }
      });
    });

    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error:", err);
    return [];
  }
};
