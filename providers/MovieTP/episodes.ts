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
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D9qV3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
      },
    });

    const $ = cheerio.load(res.data);
    const container = $(".download-links-section");

    $(".unili-content,.code-block-1").remove();

    const episodes: EpisodeLink[] = [];

    container.find("a[target='_blank']").each((index, element) => {
      const btnEl = $(element);
      const link = btnEl.attr("href");
      const buttonText = btnEl.find("button.dipesh").text().trim();

      if (link && buttonText) {
        // सिर्फ़ Gdflix वाले links को रखो
        if (!buttonText.toLowerCase().includes("gdflix")) return;

        const qualityMatch = buttonText.match(/(\d+p)\b/i)?.[1] || "HD";
        const serviceMatch = buttonText.match(/\[(.*?)\]/i)?.[1] || "Direct Download";
        const sizeMatch = buttonText.match(/(\d+\.?\d*\s*(?:GB|MB))\b/i)?.[1] || "";

        const finalTitle = `${qualityMatch} [${serviceMatch}] ${sizeMatch}`;

        episodes.push({
          title: finalTitle,
          link: link,
        });
      }
    });

    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error: ", err);
    return [];
  }
};
