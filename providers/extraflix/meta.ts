import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

const PROVIDER_NAME = "ExtraFlix";
const BASE_URL_KEY = "ExtraFlix";

type QualityRow = {
  label: string;
  quality: string;
  size?: string;
  link: string;
};

type MediaRow = {
  kind: "quality" | "episode";
  label: string;
  quality?: string;
  size?: string;
  link: string;
};

function normalizeText(value: string | undefined | null): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/g, "");
}

function fieldValue($: any, label: string): string {
  let value = "";
  $("p").each((_: number, element: any) => {
    if (value) return;
    const paragraph = $(element);
    const strong = paragraph.find("strong").first();
    if (!strong.length) return;
    const strongLabel = normalizeText(strong.text()).replace(/:\s*$/, "");
    if (strongLabel.toLowerCase() !== label.toLowerCase()) return;

    const clone = paragraph.clone();
    clone.find("strong").first().remove();
    value = normalizeText(clone.text()).replace(/^[:\s]+/, "");
  });
  return value;
}

function cleanTitle(value: string): string {
  const cleaned = normalizeText(value)
    .replace(/^Download\s+/i, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(
      /\b(?:4K|2160p|1080p|720p|480p|UHD|FHD|HEVC|x265|x264|WEB[- ]?DL|WEBRip|BluRay|HDRip|ESubs?|Dual Audio)\b.*$/i,
      " ",
    );
  return cleaned.replace(/[\s|:–-]+$/g, "").trim();
}

function parseQualityLabel(text: string): Omit<QualityRow, "link"> | null {
  const resolution = text.match(/\b(2160p|1080p|720p|480p)\b/i);
  if (!resolution) return null;

  const sizeMatch = text.match(/\[([^\]]*(?:GB|MB|TB)[^\]]*)\]/i);
  const looksLikeRow = Boolean(sizeMatch) || /[-–]\s*$/.test(text);
  if (!looksLikeRow) return null;

  const label = normalizeText(
    text.replace(/\[[^\]]*\]/g, " ").replace(/[-–]\s*$/g, ""),
  );
  if (!label) return null;

  return {
    label,
    quality: resolution[1].toLowerCase(),
    size: sizeMatch ? normalizeText(sizeMatch[1]) : undefined,
  };
}

function parseEpisodeLabel(text: string): string | null {
  const match = normalizeText(text).match(/^(?:Episode|Ep\.?)\s*(\d{1,4})\b/i);
  return match ? `Episode ${Number(match[1])}` : null;
}

function parseMediaRows($: any): MediaRow[] {
  const rows: MediaRow[] = [];
  const seen = new Set<string>();
  let pending: Omit<MediaRow, "link"> | null = null;

  const push = (href: string | undefined, row: Omit<MediaRow, "link">) => {
    if (!href || seen.has(href)) return false;
    seen.add(href);
    rows.push({ ...row, link: href });
    return true;
  };

  $(".entry-content p, .entry-content h3, .entry-content h4").each(
    (_: number, element: any) => {
      const row = $(element);
      const anchor = row.find("a[href]").first();

      if (anchor.length) {
        if (pending && push(anchor.attr("href"), pending)) pending = null;
        return;
      }

      const text = normalizeText(row.text());
      const episode = parseEpisodeLabel(text);
      if (episode) {
        pending = { kind: "episode", label: episode };
        return;
      }

      const parsed = parseQualityLabel(text);
      if (parsed) pending = { kind: "quality", ...parsed };
    },
  );

  if (!rows.length) {
    $("a.fasc-button[href]").each((_: number, element: any) => {
      const anchor = $(element);
      const href = anchor.attr("href");
      if (!href || seen.has(href)) return;

      const row = anchor.closest("p");
      const labelElement = row.length
        ? row.prevAll("p, h3, h4").first()
        : anchor.prevAll("p, h3, h4").first();
      const parsed = parseQualityLabel(normalizeText(labelElement.text()));
      if (!parsed) return;

      push(href, { kind: "quality", ...parsed });
    });
  }

  return rows;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const baseUrl = await getBaseUrl(BASE_URL_KEY);
    if (!baseUrl) {
      throw new Error(`${BASE_URL_KEY} is not configured in urls.json`);
    }

    const { axios, cheerio, commonHeaders } = providerContext;
    const url = new URL(link, `${trimBaseUrl(baseUrl)}/`).href;
    const response = await axios.get(url, {
      headers: {
        ...commonHeaders,
        Referer: `${trimBaseUrl(baseUrl)}/`,
      },
    });
    const $ = cheerio.load(response.data);

    const rawTitle =
      normalizeText($("h1").first().text()) ||
      normalizeText($("title").first().text().split("-")[0]);
    const infoHeading = normalizeText(
      $("h2")
        .filter((_: number, element: any) =>
          /color:\s*yellow/i.test($(element).attr("style") || ""),
        )
        .first()
        .text(),
    );
    const title = cleanTitle(rawTitle) || infoHeading || rawTitle;

    const isSeries =
      /\bseason\b/i.test(rawTitle) || /\bseries\b/i.test(rawTitle);
    const type: "movie" | "series" = isSeries ? "series" : "movie";

    const description =
      normalizeText($('meta[name="description"]').attr("content")) ||
      normalizeText($('meta[property="og:description"]').attr("content"));
    const synopsis = fieldValue($, "Plot") || description || title;

    const ogImage = normalizeText($('meta[property="og:image"]').attr("content"));
    const pageImage = normalizeText(
      $(".Poster-Container img, .entry-content img").first().attr("src"),
    );
    const image = ogImage || pageImage;

    const imdbHref =
      $('a[href*="imdb.com/title/"]').first().attr("href") || "";
    const imdbId = imdbHref.match(/tt\d+/)?.[0] || "";

    const ratingText = normalizeText($(".IMDB-Rating").first().text());
    const rating = ratingText.match(/(\d+(?:\.\d+)?)\s*$/)?.[1];

    const genres = fieldValue($, "Genres")
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);
    const cast = fieldValue($, "Actors")
      .split(",")
      .map((actor) => actor.trim())
      .filter(Boolean)
      .slice(0, 10);

    const toAbsolute = (href: string) => {
      try {
        return new URL(href, `${trimBaseUrl(baseUrl)}/`).href;
      } catch {
        return href;
      }
    };

    const mediaRows = parseMediaRows($);
    const episodeRows = mediaRows.filter((row) => row.kind === "episode");
    const qualityRows = mediaRows.filter((row) => row.kind === "quality");
    const linkList: Link[] = [];

    if (episodeRows.length) {
      const season = rawTitle.match(/\bSeason\s+(\d+)/i);
      linkList.push({
        title: season ? `Season ${Number(season[1])}` : "Episodes",
        directLinks: episodeRows.map((row) => ({
          title: row.label,
          link: toAbsolute(row.link),
          type: "series",
        })),
      });
    }

    for (const row of qualityRows) {
      linkList.push({
        title: row.size ? `${row.label} - ${row.size}` : row.label,
        quality: row.quality,
        directLinks: [
          {
            title: row.label,
            link: toAbsolute(row.link),
            type,
            description: row.size ? `Size: ${row.size}` : undefined,
          },
        ],
      });
    }

    return {
      title,
      image,
      poster: image,
      synopsis,
      imdbId,
      type,
      rating,
      cast: cast.length ? cast : undefined,
      tags: genres.length ? genres : undefined,
      linkList,
      webUrl: url,
    };
  } catch (error) {
    throwProviderError(PROVIDER_NAME, "metadata", error);
  }
};
