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
        Referer: url.split("/").slice(0, 3).join("/"),
        // Cookie may be needed for Cloudflare / bot protection
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
      },
    });

    const $ = cheerio.load(res.data);

    // ---------------- Cinejoy season page ----------------
    const seasonMatch =
      url.match(/\/season\/(\d+)/i) || url.match(/[?&]season=(\d+)/i);
    const season = seasonMatch?.[1];

    let grid = season
      ? $(`#cinejoy-season-${season}`)
      : $(".cinejoy-season-grid.active");

    if (!grid.length) grid = $(".cinejoy-season-grid.active").first();
    if (!grid.length) grid = $(".cinejoy-season-grid").first();

    if ($(".cinejoy-episodes-section").length && grid.length) {
      const episodes: EpisodeLink[] = [];
      const baseUrl = url.split("/").slice(0, 3).join("/");

      grid.find(".cinejoy-ep-card").each((_, card) => {
        const el = $(card);

        const a = el.find("a.cinejoy-ep-thumb-link").first();
        let href =
          a.attr("href") ||
          el.find("a.cinejoy-ep-name").first().attr("href") ||
          "";

        if (!href) return;

        if (href.startsWith("/")) {
          href = baseUrl + href;
        }

        const epNo = el.find(".cinejoy-ep-badge-num").first().text().trim();
        const name =
          el.find(".cinejoy-ep-name").first().text().trim() ||
          el.find(".cinejoy-ep-name").first().attr("title") ||
          "";

        episodes.push({
          title: epNo ? `${epNo} ${name}`.trim() : name,
          link: href,
        });
      });

      if (episodes.length) return episodes;
    }

    // ---------------- Fallback: m4ulinks / download links page ----------------
    const container = $(".entry-content,.entry-inner, .download-links-div");
    $(".unili-content,.code-block-1").remove();

    const episodes: EpisodeLink[] = [];

    container.find("h5").each((_, element) => {
      const el = $(element);
      const title = el.text().trim();

      const hubCloudLink = el
        .next(".downloads-btns-div")
        .find(
          'a[style*="background: linear-gradient(135deg,#e629d0,#007bff);"]'
        )
        .attr("href");

      if (title && hubCloudLink) {
        episodes.push({
          title: title.replace(/[-:]/g, "").trim(),
          link: hubCloudLink,
        });
      }
    });

    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error:", err);
    return [];
  }
};