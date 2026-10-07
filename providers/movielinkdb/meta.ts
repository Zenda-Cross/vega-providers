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

// ---------------------------------------------------------------------------
// Base64 decoder
// ---------------------------------------------------------------------------

function base64ToBinary(b64: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = b64.replace(/=+$/, "").replace(/[^A-Za-z0-9+/]/g, "");
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = chars.indexOf(clean[i]);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

function decodeDownloadLink(
  encoded: string,
  seedHex: string,
  rounds: number,
): string {
  try {
    let x = (parseInt(seedHex, 16) >>> 0) || 0;
    const r = Math.max(0, rounds | 0);

    for (let i = 0; i < r; i++) {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    }

    const raw = base64ToBinary(encoded);
    let out = "";
    for (let j = 0; j < raw.length; j++) {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0;
      const key = (x >>> 16) & 0xff;
      out += String.fromCharCode(raw.charCodeAt(j) ^ key);
    }
    return out;
  } catch {
    return "";
  }
}

function resolveUrl(href: string, baseUrl: string): string {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return "https:" + href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
  }
}

interface ParsedAnchor {
  url: string;
  quality: string;
  size: string;
}

function parseDownloadAnchor(
  anchor: any,
  baseUrl: string,
): ParsedAnchor | null {
  const plainHref = (anchor.attr("href") || "").trim();
  const dataDl = (anchor.attr("data-dl") || "").trim();
  const dataDs = (anchor.attr("data-ds") || "0").trim();
  const dataDr = parseInt(anchor.attr("data-dr") || "0", 10) || 0;

  let directUrl = "";
  if (dataDl) {
    const decoded = decodeDownloadLink(dataDl, dataDs, dataDr);
    if (decoded) directUrl = resolveUrl(decoded, baseUrl);
  } else if (plainHref && plainHref !== "#") {
    directUrl = resolveUrl(plainHref, baseUrl);
  }
  if (!directUrl) return null;

  const buttonText = anchor.find(".btn-text").text().trim();
  const qualityMatch = buttonText.match(/(\d+p)/i);
  const sizeMatch = buttonText.match(/•\s*([\d.]+)\s*(GB|MB)/i);

  const quality = qualityMatch ? qualityMatch[1].toLowerCase() : "";
  const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : "";

  return { url: directUrl, quality, size };
}

// ---------------------------------------------------------------------------
// getMeta
// ---------------------------------------------------------------------------

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const url = link;

  let baseUrl = "";
  try {
    baseUrl = new URL(url).origin;
  } catch {
    baseUrl = "";
  }

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

    // --- Type ----------------------------------------------------------
    // ★ Added /anime/ detection so anime pages use the episode grid
    if (/\/series\//i.test(url)) result.type = "series";
    else if (/\/drama\//i.test(url)) result.type = "drama";
    else if (/\/anime\//i.test(url)) result.type = "anime";
    else result.type = "movie";

    // --- Title ---------------------------------------------------------
    const rawTitle =
      $(".movie-info-view h1").first().text().trim() ||
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      "";
    result.title =
      rawTitle.replace(/\s*\(\d{4}\)[\s\S]*$/, "").trim() || "Unknown Title";

    // --- Image ---------------------------------------------------------
    let image =
      $(".image-container-view img").first().attr("src")?.trim() ||
      $("meta[property='og:image']").attr("content")?.trim() ||
      "";
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ------------------------------------------------------
    const storyline = $(".story-text").first().text().trim();
    if (storyline) result.synopsis = storyline;

    // --- IMDb ----------------------------------------------------------
    result.imdbId = "";

    const links: Link[] = [];
    const movieTitle = result.title;

    const hasEpisodeGrid = $("#mlbdEpisodeDownloadGrid .ep-card").length > 0;
    // ★ Now includes "anime" alongside "series" and "drama"
    const isSeries =
      result.type === "series" ||
      result.type === "drama" ||
      result.type === "anime";

    // ===================================================================
    // MOVIE — one Link per quality (480p, 720p, 1080p, Best, …)
    // ===================================================================
    if (!isSeries || !hasEpisodeGrid) {
      $(".mlbd-download-button-wrap").each((_, element) => {
        const anchor = $(element).find("a").first();
        if (!anchor.length) return;

        const parsed = parseDownloadAnchor(anchor, baseUrl);
        if (!parsed) return;

        const qualityLabel = parsed.quality || "download";
        const linkTitle = `${qualityLabel}${
          parsed.size ? ` [${parsed.size}]` : ""
        }`;

        links.push({
          title: linkTitle,
          quality: parsed.quality,
          episodesLink: "",
          directLinks: [
            {
              title: linkTitle,
              link: parsed.url,
              type: (result.type === "movie" ? "movie" : "series") as "movie" | "series",
            },
          ],
        });
      });

      result.linkList = links;
      return result;
    }

    // ===================================================================
    // SERIES / DRAMA / ANIME — one Link per QUALITY
    //   Each Link's directLinks = all episodes for that quality
    // ===================================================================

    const qualityGroups: Record<
      string,
      {
        episodeLabel: string;
        url: string;
        seasonNum: string;
        epNum: number;
        sortOrder: number;
      }[]
    > = {};

    // Collect "Complete Series" bundle buttons (if any)
    const bundleGroups: Record<string, { url: string; size: string }> = {};
    $(".mlbd-download-button-wrap").each((_, element) => {
      const anchor = $(element).find("a").first();
      if (!anchor.length) return;

      const parsed = parseDownloadAnchor(anchor, baseUrl);
      if (!parsed) return;

      const q = parsed.quality || "download";
      if (!bundleGroups[q]) {
        bundleGroups[q] = { url: parsed.url, size: parsed.size };
      }
    });

    // ---- Walk every episode card & bucket by quality ----
    let sortIndex = 0;
    $("#mlbdEpisodeDownloadGrid .ep-card").each((_, element) => {
      const $card = $(element);

      // Episode title — prefer the visible <h5>
      let epTitle = $card.find(".mlbd-episode-title").first().text().trim();
      if (!epTitle) {
        const epAttr = String($card.attr("data-episode-number") || "").trim();
        epTitle = epAttr ? `Episode ${epAttr}` : "Episode";
      }

      const seasonNum = String($card.attr("data-season-number") || "").trim();
      const epNumRaw = String($card.attr("data-episode-number") || "").trim();
      const epNum = epNumRaw ? parseInt(epNumRaw, 10) || 999 : 999;

      // Each quality button on this episode
      $card.find("a.mlbd-episode-download-btn, a[data-dl]").each(
        (__: number, a: any) => {
          const parsed = parseDownloadAnchor($(a), baseUrl);
          if (!parsed) return;

          const quality = parsed.quality || "download";

          if (!qualityGroups[quality]) qualityGroups[quality] = [];

          const episodeLabel = seasonNum
            ? `S${seasonNum} • ${epTitle}${
                parsed.size ? ` • ${parsed.size}` : ""
              }`
            : `${epTitle}${parsed.size ? ` • ${parsed.size}` : ""}`;

          qualityGroups[quality].push({
            episodeLabel,
            url: parsed.url,
            seasonNum,
            epNum,
            sortOrder: sortIndex++,
          });
        },
      );
    });

    // ---- Emit one Link per quality, sorted by resolution ----
    const qualitySortKey = (q: string): number => {
      const m = q.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 9999;
    };

    const sortedQualities = Object.keys(qualityGroups).sort(
      (a, b) => qualitySortKey(a) - qualitySortKey(b),
    );

    for (const quality of sortedQualities) {
      const items = qualityGroups[quality];

      items.sort((a, b) => {
        if (a.seasonNum !== b.seasonNum)
          return Number(a.seasonNum || 0) - Number(b.seasonNum || 0);
        if (a.epNum !== b.epNum) return a.epNum - b.epNum;
        return a.sortOrder - b.sortOrder;
      });

      const directLinks = items.map((it) => ({
        title: it.episodeLabel,
        link: it.url,
        type: (result.type === "movie" ? "movie" : "series") as "movie" | "series",
      }));

      const bundle = bundleGroups[quality];
      if (bundle) {
        directLinks.unshift({
          title: `Complete Series${bundle.size ? ` • ${bundle.size}` : ""}`,
          link: bundle.url,
          type: (result.type === "movie" ? "movie" : "series") as "movie" | "series",
        });
      }

      links.push({
        title: quality,
        quality: quality,
        episodesLink: "",
        directLinks,
      });
    }

    // Only bundle buttons (no episode grid data)
    if (sortedQualities.length === 0) {
      Object.keys(bundleGroups)
        .sort((a, b) => qualitySortKey(a) - qualitySortKey(b))
        .forEach((q) => {
          const b = bundleGroups[q];
          links.push({
            title: q,
            quality: q,
            episodesLink: "",
            directLinks: [
              {
                title: `Complete Series${b.size ? ` • ${b.size}` : ""}`,
                link: b.url,
                type: (result.type === "movie" ? "movie" : "series") as "movie" | "series",
              },
            ],
          });
        });
    }

    result.linkList = links;
    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};