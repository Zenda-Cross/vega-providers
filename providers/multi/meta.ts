import { Info, Link, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const url = link;
  const baseUrl = url.split("/").slice(0, 3).join("/");

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    const response = await axios.get(url, {
      headers: { ...headers, Referer: baseUrl },
    });

    const $ = cheerio.load(response.data);

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // Pull inline watchItem / watchConfig JSON objects
    let watchItem: any = null;
    let watchConfig: any = null;

    $("script").each((_, el) => {
      const txt = $(el).html() || "";

      const itemMatch = txt.match(
        /const\s+watchItem\s*=\s*(\{[\s\S]*?\})\s*;/
      );
      if (itemMatch && !watchItem) {
        try {
          watchItem = JSON.parse(itemMatch[1]);
        } catch (_) {}
      }

      const cfgMatch = txt.match(
        /const\s+watchConfig\s*=\s*(\{[\s\S]*?\})\s*;/
      );
      if (cfgMatch && !watchConfig) {
        try {
          watchConfig = JSON.parse(cfgMatch[1]);
        } catch (_) {}
      }
    });

    // Title
    result.title =
      watchItem?.title?.toString().trim() ||
      $(".cinejoy-detail-title").first().text().trim() ||
      $(".watch-details-summary").first().text().trim() ||
      "Unknown Title";

    // Poster image
    result.image =
      watchItem?.poster ||
      $(".watch-bg img").first().attr("src") ||
      $(".cinejoy-detail-poster img").first().attr("src") ||
      "";

    // Synopsis
    result.synopsis =
      $("#cinejoyOverview").first().text().trim() ||
      $(".cinejoy-detail-overview").first().text().trim() ||
      "";

    // Type – check for Cinejoy episodes section
    const hasCinejoyEpisodes = $(".cinejoy-episodes-section").length > 0;
    result.type =
      watchItem?.type === "tv" || hasCinejoyEpisodes ? "tv" : "movie";

    // IMDb ID (not exposed in this HTML)
    result.imdbId = "";

    // Build linkList
    const linkList: Link[] = [];

    if (result.type === "tv" || hasCinejoyEpisodes) {
      // Strip any query string and trailing slashes to get the canonical series URL
      // e.g. https://site.com/series/the-boys-1560?season=2 -> https://site.com/series/the-boys-1560
      const seriesBase = url
        .split("?")[0]
        .replace(/\/$/, "")
        .replace(/\/season\/\d+(\/episode\/\d+)?$/i, "")
        .replace(/\/episode\/\d+$/i, "");

      const seasonMap = new Map<
        string,
        { title: string; episodesLink: string }
      >();

      // 1) Season dropdown
      $(".cinejoy-season-select option").each((_, opt) => {
        const season = ($(opt).attr("value") || "").trim();
        if (!season) return;

        const label = $(opt).text().trim() || `Season ${season}`;

        seasonMap.set(season, {
          title: label,
          // Use query-string style URL
          episodesLink: `${seriesBase}?season=${season}`,
        });
      });

      // 2) Season grids (fallback)
      $(".cinejoy-season-grid").each((_, grid) => {
        const id = $(grid).attr("id") || "";
        const m = id.match(/cinejoy-season-(\d+)/);
        if (!m) return;

        const season = m[1];
        if (seasonMap.has(season)) return;

        seasonMap.set(season, {
          title: `Season ${season}`,
          episodesLink: `${seriesBase}?season=${season}`,
        });
      });

      if (seasonMap.size > 0) {
        seasonMap.forEach((value) => {
          linkList.push({
            title: value.title,
            quality: "",
            episodesLink: value.episodesLink,
            directLinks: [],
          });
        });
      } else {
        // Fallback: single season entry
        linkList.push({
          title: "Season 1",
          quality: "",
          episodesLink: `${seriesBase}?season=1`,
          directLinks: [],
        });
      }
    } else {
      // Movie / single‑link behaviour
      linkList.push({
        title: result.title,
        quality: "",
        episodesLink: url,
        directLinks: [
          {
            title: result.title,
            link: url,
            type: "movie",
          },
        ],
      });
    }

    result.linkList = linkList;

    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};