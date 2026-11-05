import { EpisodeLink, Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  getCinemetaMeta,
  CinemetaMeta,
  enrichCinemetaEpisodes,
} from "../getCinemetaMeta";

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
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

/* ------------------------------------------------------------------ */
/*  Language ordering / normalisation                                  */
/* ------------------------------------------------------------------ */
const PREFERRED_LANG_ORDER = [
  "Hindi DUB", "Hindi", "Tamil", "Telugu", "English", "Japanese",
  "Korean", "Malayalam", "Kannada", "Bengali", "Marathi", "Punjabi",
  "Urdu", "Multi-Audio", "Multi Audio", "MultiAudio",
];

const langOrderIndex = (lang: string): number => {
  const idx = PREFERRED_LANG_ORDER.findIndex(
    (l) => l.toLowerCase() === lang.toLowerCase(),
  );
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const normalizeLang = (raw: string): string => {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (/^hindi\s*dub$/i.test(cleaned)) return "Hindi DUB";
  if (/^hindi$/i.test(cleaned)) return "Hindi";
  if (/^tamil$/i.test(cleaned)) return "Tamil";
  if (/^telugu$/i.test(cleaned)) return "Telugu";
  if (/^english$/i.test(cleaned)) return "English";
  if (/^japanese$/i.test(cleaned)) return "Japanese";
  if (/^korean$/i.test(cleaned)) return "Korean";
  return cleaned;
};

/* ------------------------------------------------------------------ */
/*  Server link detection                                              */
/* ------------------------------------------------------------------ */
type ServerDef = { re: RegExp; name: string; order: number };

const SERVER_DEFS: ServerDef[] = [
  { re: /^hubcloud$/i, name: "HubCloud", order: 1 },
  { re: /hubcloud/i, name: "HubCloud", order: 1 },
  { re: /^watch\s*multi\s*quality$/i, name: "Watch Multi Quality", order: 2 },
  { re: /watch\s*multi\s*quality/i, name: "Watch Multi Quality", order: 2 },
  { re: /^watchmulti(quality)?$/i, name: "Watch Multi Quality", order: 2 },
  { re: /watchmulti(quality)?/i, name: "Watch Multi Quality", order: 2 },
  { re: /^watch\s*now$/i, name: "Watch Now", order: 3 },
  { re: /watch\s*now/i, name: "Watch Now", order: 3 },
  { re: /^dl\s*beta$/i, name: "DL Beta", order: 4 },
  { re: /dl\s*beta/i, name: "DL Beta", order: 4 },
  { re: /^mega$/i, name: "Mega", order: 5 },
  { re: /mega/i, name: "Mega", order: 5 },
  { re: /^gdrive$|^google\s*drive$/i, name: "GDrive", order: 6 },
  { re: /gdrive|google\s*drive/i, name: "GDrive", order: 6 },
  { re: /^gdflix$/i, name: "GDFlix", order: 7 },
  { re: /gdflix/i, name: "GDFlix", order: 7 },
];

const matchServer = (anchorText: string): ServerDef | null => {
  const t = anchorText.trim();
  for (const def of SERVER_DEFS) if (def.re.test(t)) return def;
  return null;
};

type PickedLink = { name: string; href: string; order: number };

function pickBestServerLink($: any, p: any): PickedLink | null {
  const candidates: PickedLink[] = [];
  p.find("a").each((_: number, a: any) => {
    const $a = $(a);
    const href: string | undefined = $a.attr("href");
    if (!href) return;
    if (
      !href.includes("codedew.com/zipper") &&
      !href.includes("hubcloud")
    ) {
      return;
    }
    const anchorText = $a.text().trim();
    const server = matchServer(anchorText);
    if (!server) return;
    candidates.push({ name: server.name, href, order: server.order });
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.order - b.order);
  return candidates[0];
}

/* ------------------------------------------------------------------ */
/*  Cinemeta → Info overlay (same logic as Vega)                       */
/* ------------------------------------------------------------------ */
function applyCinemeta(info: Info, meta?: CinemetaMeta | null): Info {
  if (!meta) return info;
  return {
    ...info,
    title: meta.name || info.title,
    image: meta.background || meta.poster || info.image,
    poster: meta.poster || info.poster,
    logo: meta.logo || undefined,
    synopsis: meta.description || info.synopsis,
    imdbId: meta.imdb_id || info.imdbId || "",
    tmdbId: meta.moviedb_id?.toString() || info.tmdbId || undefined,
    type: meta.type || info.type,
    tags: meta.genres || meta.genre || undefined,
    cast: meta.cast || undefined,
    rating: meta.imdbRating || undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  IMDb extraction                                                    */
/* ------------------------------------------------------------------ */
function extractImdbId($: any): string {
  const fromLink = $('a[href*="imdb.com/title/tt"]')
    .first()
    .attr("href")
    ?.match(/tt\d{7,}/)?.[0];
  if (fromLink) return fromLink;

  const fromMeta = $('meta[property="og:see_also"], meta[name="imdb"]')
    .attr("content")
    ?.match(/tt\d{7,}/)?.[0];
  if (fromMeta) return fromMeta;

  const fromJsonLd = $('script[type="application/ld+json"]')
    .text()
    .match(/tt\d{7,}/)?.[0];
  if (fromJsonLd) return fromJsonLd;

  const fromHtml = $.html().match(/tt\d{7,}/)?.[0];
  return fromHtml || "";
}

/* ------------------------------------------------------------------ */
/*  getMeta                                                            */
/* ------------------------------------------------------------------ */
export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const currentBaseUrl = await getBaseUrl("RareAnimes");
  const url = new URL(link, `${currentBaseUrl}/`).href;
  const baseUrl = url.split("/").slice(0, 3).join("/");

  try {
    const response = await axios.get(url, {
      headers: { ...headers, Referer: baseUrl },
    });
    const $ = cheerio.load(response.data);

    /* ─── Core fields ─────────────────────────────────────── */
    const title =
      $("h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      "Unknown Title";

    let image =
      $(".herald-post-thumbnail img").first().attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;

    let synopsis = "";
    $(".entry-content p").each((_, el) => {
      const p = $(el);
      const spans = p.find("span");
      if (spans.length === 0) return;
      if (/^Synopsis/i.test(spans.first().text().trim())) {
        synopsis = spans.last().text().trim();
        return false;
      }
    });
    if (!synopsis) {
      $(".entry-content p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.startsWith("✅") && text.length > 40) {
          synopsis = text;
          return false;
        }
      });
    }

    const imdbId = extractImdbId($);

    const detectSeasonNumber = (): number | null => {
      let found: number | null = null;
      $(".entry-content p").each((_, el) => {
        const m = $(el).text().match(/Season\s*:?\s*0*(\d+)/i);
        if (m) {
          found = Number(m[1]);
          return false;
        }
      });
      if (found !== null) return found;
      const tm = title.match(/Season\s*0*(\d+)/i);
      return tm ? Number(tm[1]) : null;
    };

    const contentText = $(".entry-content").text();
    const hasEpisodes = /Episode\s+\d+/i.test(contentText);
    const type: "movie" | "series" = hasEpisodes ? "series" : "movie";

    /* ─── Fetch Cinemeta ONCE, reuse for both enrichment paths ─── */
    let cinemeta: CinemetaMeta | null = null;
    if (imdbId) {
      try {
        cinemeta = await getCinemetaMeta(imdbId, type, providerContext);
      } catch (e) {
        console.warn("RareAnimes: Cinemeta lookup failed", e);
      }
    }

    /* ─── linkList ────────────────────────────────────────── */
    const linkList: Link[] = [];

    if (hasEpisodes) {
      const seasonNumber = detectSeasonNumber();
      const langMap = new Map<string, EpisodeLink[]>();
      let currentEpisode: { num: string; name: string } | null = null;

      $(".entry-content p").each((_, el) => {
        const p = $(el);
        const fullText = p.text().trim();

        const epMatch = fullText.match(
          /^Episode\s+0*(\d+)\s*(?:[–\-—:]\s*(.+?))?\s*$/i,
        );
        if (epMatch) {
          currentEpisode = {
            num: epMatch[1],
            name: (epMatch[2] || "").trim(),
          };
          return;
        }

        if (!currentEpisode) return;
        const firstSpan = p.find("span").first();
        if (!firstSpan.length) return;

        const langMatch = firstSpan.text().trim().match(
          /^(Hindi\s*DUB|Hindi|Tamil|Telugu|English|Japanese|Korean|Malayalam|Kannada|Bengali|Marathi|Punjabi|Urdu|Multi[\s-]?Audio)\b/i,
        );
        if (!langMatch) return;
        const langName = normalizeLang(langMatch[1]);

        const picked = pickBestServerLink($, p);
        if (!picked) return;

        const episodeTitle = currentEpisode.name
          ? `Episode ${currentEpisode.num} – ${currentEpisode.name}`
          : `Episode ${currentEpisode.num}`;

        if (!langMap.has(langName)) langMap.set(langName, []);
        langMap.get(langName)!.push({ title: episodeTitle, link: picked.href });
      });

      if (langMap.size > 0) {
        const langs = Array.from(langMap.keys()).sort((a, b) => {
          const ia = langOrderIndex(a);
          const ib = langOrderIndex(b);
          if (ia !== ib) return ia - ib;
          return a.localeCompare(b);
        });

        const videos = cinemeta?.videos || [];

        for (const lang of langs) {
          const eps = langMap.get(lang)!;

          /* ★ Cinemeta episode enrichment (same helper as Vega) */
          const enrichedEps =
            seasonNumber !== null && videos.length > 0
              ? enrichCinemetaEpisodes(eps, videos, seasonNumber)
              : eps;

          const entryTitle =
            seasonNumber !== null
              ? langs.length === 1
                ? `Season ${seasonNumber}`
                : `Season ${seasonNumber} · ${lang}`
              : lang;

          linkList.push({
            title: entryTitle,
            quality: "auto",
            directLinks: enrichedEps,
          });
        }
      }
    }

    /* ─── Movie / fallback branch ─────────────────────────── */
    if (!hasEpisodes || linkList.length === 0) {
      const singleLinks: EpisodeLink[] = [];
      const seenLinks = new Set<string>();
      const seenServers = new Set<string>();

      $(".entry-content a").each((_, a) => {
        const $a = $(a);
        const href = $a.attr("href");
        if (!href) return;
        if (
          !href.includes("codedew.com/zipper") &&
          !href.includes("hubcloud")
        ) {
          return;
        }
        const anchorText = $a.text().trim();
        const server = matchServer(anchorText);
        if (!server) return;
        if (seenServers.has(server.name)) return;
        if (seenLinks.has(href)) return;
        seenServers.add(server.name);
        seenLinks.add(href);
        singleLinks.push({ title: server.name, link: href });
      });

      singleLinks.sort((a, b) => {
        const ao =
          SERVER_DEFS.find((d) => d.name === a.title)?.order ?? 999;
        const bo =
          SERVER_DEFS.find((d) => d.name === b.title)?.order ?? 999;
        return ao - bo;
      });

      if (singleLinks.length > 0) {
        const seasonNumber = detectSeasonNumber();
        const fallbackTitle =
          type === "movie"
            ? "Movie"
            : seasonNumber !== null
              ? `Season ${seasonNumber}`
              : "Download";
        linkList.push({
          title: fallbackTitle,
          quality: "auto",
          directLinks: singleLinks,
        });
      } else if (linkList.length === 0) {
        linkList.push({
          title: "Watch",
          quality: "auto",
          directLinks: [{ title: "Watch", link }],
        });
      }
    }

    /* ─── Build Info + apply Cinemeta overlay ─────────────── */
    const baseInfo: Info = {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList,
    };

    return applyCinemeta(baseInfo, cinemeta);
  } catch (err) {
    throwProviderError("RareAnimes", "info", err);
  }
};