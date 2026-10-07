import { EpisodeLink, ProviderContext } from "../types";

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

// ---------------------------------------------------------------------------
// getEpisodes
// ---------------------------------------------------------------------------

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;
  console.log("[getEpisodes] Fetching:", url);

  let baseUrl = "";
  try {
    baseUrl = new URL(url).origin;
  } catch {
    baseUrl = "";
  }

  try {
    const res = await axios.get(url, {
      headers: { ...headers, Referer: baseUrl },
    });
    const $ = cheerio.load(res.data || "");

    // ★ Detect the page type so we can label entries correctly.
    //   /series/ → series, /drama/ → drama, /anime/ → anime, else movie
    let pageType: string = "series";
    if (/\/anime\//i.test(url)) pageType = "anime";
    else if (/\/drama\//i.test(url)) pageType = "drama";
    else if (/\/series\//i.test(url)) pageType = "series";

    // ─────────────────────────────────────────────────────────────────
    // Collect episodes from the grid
    // ─────────────────────────────────────────────────────────────────
    interface RawEpisode {
      title: string;
      link: string;
      seasonNum: string;
      epNum: number;
      quality: string;
      size: string;
      sortOrder: number;
    }

    const collected: RawEpisode[] = [];

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
          const $a = $(a);
          const dataDl = ($a.attr("data-dl") || "").trim();
          const dataDs = ($a.attr("data-ds") || "0").trim();
          const dataDr = parseInt($a.attr("data-dr") || "0", 10) || 0;

          if (!dataDl) return;

          const decoded = decodeDownloadLink(dataDl, dataDs, dataDr);
          if (!decoded) return;

          const directUrl = resolveUrl(decoded, baseUrl);

          const buttonText = $a.find(".btn-text").text().trim();
          const qualityMatch = buttonText.match(/(\d+p)/i);
          const sizeMatch = buttonText.match(/•\s*([\d.]+)\s*(GB|MB)/i);

          const quality = qualityMatch
            ? qualityMatch[1].toLowerCase()
            : "";
          const size = sizeMatch
            ? `${sizeMatch[1]} ${sizeMatch[2]}`
            : "";

          collected.push({
            title: epTitle,
            link: directUrl,
            seasonNum,
            epNum,
            quality,
            size,
            sortOrder: collected.length,
          });
        },
      );
    });

    // ─────────────────────────────────────────────────────────────────
    // Sort: by season, then episode, then quality (ascending), then DOM order
    // ─────────────────────────────────────────────────────────────────
    const qualitySortKey = (q: string): number => {
      const m = q.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 9999;
    };

    collected.sort((a, b) => {
      if (a.seasonNum !== b.seasonNum)
        return Number(a.seasonNum || 0) - Number(b.seasonNum || 0);
      if (a.epNum !== b.epNum) return a.epNum - b.epNum;
      const qa = qualitySortKey(a.quality);
      const qb = qualitySortKey(b.quality);
      if (qa !== qb) return qa - qb;
      return a.sortOrder - b.sortOrder;
    });

    // ─────────────────────────────────────────────────────────────────
    // Emit as EpisodeLink[]
    //   Title format:
    //     "S01 • Episode 13 • 720p [245 MB]"
    //     "Episode 13 • 720p [245 MB]"     (when no season number)
    // ─────────────────────────────────────────────────────────────────
    const episodes: EpisodeLink[] = collected.map((ep) => {
      const prefix = ep.seasonNum
        ? `S${ep.seasonNum} • ${ep.title}`
        : ep.title;

      const title = `${prefix}${
        ep.quality ? ` • ${ep.quality}` : ""
      }${ep.size ? ` [${ep.size}]` : ""}`;

      return { title, link: ep.link };
    });

    // ─────────────────────────────────────────────────────────────────
    // Also surface "Complete Series" bundle buttons (if present)
    // at the top of the list.
    // ─────────────────────────────────────────────────────────────────
    const bundleEntries: EpisodeLink[] = [];
    $(".mlbd-download-button-wrap").each((_, element) => {
      const anchor = $(element).find("a").first();
      if (!anchor.length) return;

      const dataDl = (anchor.attr("data-dl") || "").trim();
      const dataDs = (anchor.attr("data-ds") || "0").trim();
      const dataDr = parseInt(anchor.attr("data-dr") || "0", 10) || 0;
      const plainHref = (anchor.attr("href") || "").trim();

      let directUrl = "";
      if (dataDl) {
        const decoded = decodeDownloadLink(dataDl, dataDs, dataDr);
        if (decoded) directUrl = resolveUrl(decoded, baseUrl);
      } else if (plainHref && plainHref !== "#") {
        directUrl = resolveUrl(plainHref, baseUrl);
      }
      if (!directUrl) return;

      const buttonText = anchor.find(".btn-text").text().trim();
      const qualityMatch = buttonText.match(/(\d+p)/i);
      const sizeMatch = buttonText.match(/•\s*([\d.]+)\s*(GB|MB)/i);

      const quality = qualityMatch
        ? qualityMatch[1].toLowerCase()
        : "";
      const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : "";

      const title = `Complete Series${
        quality ? ` • ${quality}` : ""
      }${size ? ` [${size}]` : ""}`;

      bundleEntries.push({ title, link: directUrl });
    });

    const allEpisodes = [...bundleEntries, ...episodes];

    console.log(
      `[getEpisodes] Found ${allEpisodes.length} entr${
        allEpisodes.length === 1 ? "y" : "ies"
      } (type=${pageType})`,
    );
    return allEpisodes;
  } catch (err: any) {
    console.error("[getEpisodes] Error:", err?.message || err);
    return [];
  }
};