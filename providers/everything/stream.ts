import { Stream, ProviderContext } from "../types";

const DIRECT_REGEX =
  /(r2\.dev|workers\.dev|foxcloud\.rest|neetflixcdn|drive\.google\.com\/uc|video-downloads\.googleusercontent|vikingfile\.com\/download|download\d*\.mediafire|111477|sermoviedown|highxhd|archive\.org|uupload\.ir|hakunaymatata\.com|vadapav\.mov|tattooin\.ru|public\.animeout|nimbus\.animeout|mydriveku|dl\.anime7\.download|\.mkv($|\?)|\.mp4($|\?)|\.webm($|\?)|\.avi($|\?))/i;

const EXCLUDE_REGEX =
  /hubcloud|hubdrive|pixeldrain|telegram|t\.me|\.rar($|\?)|\.zip($|\?)/i;

function isDirectLink(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (EXCLUDE_REGEX.test(url)) return false;
  return DIRECT_REGEX.test(url);
}

function normalizeStr(e: string): string {
  return String(e || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeAndClean(e: string): string {
  let t = String(e || "");
  try {
    t = decodeURIComponent(t);
  } catch {}
  return t.replace(/[+_]/g, " ");
}

function parseSeasonEpisodes(e: string) {
  const t = decodeAndClean(e);
  const n: Array<{ season: number | null; episode?: number; epFrom?: number; epTo?: number }> = [];

  const addEntry = (
    s: string | null,
    ep: string | null,
    epFrom: string | null,
    epTo: string | null,
  ) => {
    const a = s == null ? null : Number(s);
    if (a != null && (!Number.isFinite(a) || a < 0 || a > 100)) return;
    if (ep != null) {
      const eNum = Number(ep);
      if (!Number.isFinite(eNum) || eNum < 1 || eNum > 999) return;
      n.push({ season: a, episode: eNum });
      return;
    }
    if (epFrom != null && epTo != null) {
      const eNum = Number(epFrom);
      const tNum = Number(epTo);
      if (!Number.isFinite(eNum) || !Number.isFinite(tNum)) return;
      n.push({ season: a, epFrom: Math.min(eNum, tNum), epTo: Math.max(eNum, tNum) });
      return;
    }
    if (a != null) n.push({ season: a });
  };

  for (const match of t.matchAll(/\bS(\d{1,2})E(\d{1,3})\s*[-–to]+\s*E?(\d{1,3})\b/gi)) {
    addEntry(match[1], null, match[2], match[3]);
  }
  for (const match of t.matchAll(/\bS(\d{1,2})E(\d{1,3})\b/gi)) {
    addEntry(match[1], match[2], null, null);
  }
  for (const match of t.matchAll(/\bS(\d{1,2})[.\s_-]+E(\d{1,3})\b/gi)) {
    addEntry(match[1], match[2], null, null);
  }
  for (const match of t.matchAll(/\b(\d{1,2})x(\d{1,3})\b/gi)) {
    addEntry(match[1], match[2], null, null);
  }
  for (const match of t.matchAll(
    /\bSeasons?\s*(\d{1,2})\s*(?:[-–:]\s*)?(?:Episode|Episodes|Ep)\s*(\d{1,3})\b/gi,
  )) {
    addEntry(match[1], match[2], null, null);
  }
  for (const match of t.matchAll(
    /\bSeasons?\s*(\d{1,2})\b[^.\n]{0,40}?\b(?:Episode|Episodes|Ep)\s*(\d{1,3})\s*[-–to]+\s*(\d{1,3})\b/gi,
  )) {
    addEntry(match[1], null, match[2], match[3]);
  }
  for (const match of t.matchAll(/\bSeasons?\s*(\d{1,2})\b/gi)) {
    addEntry(match[1], null, null, null);
  }
  for (const match of t.matchAll(/\bS(\d{1,2})(?!\d|E\d)\b/gi)) {
    addEntry(match[1], null, null, null);
  }

  return n;
}

function titleMatch(e: string, t: string): boolean {
  const n = normalizeStr(t);
  const r = normalizeStr(e);
  if (!n || !r) return false;
  if (r.includes(n)) return true;
  const i = n.split(" ").filter((w) => w.length > 2);
  return i.length
    ? i.filter((w) => r.includes(w)).length >= Math.ceil(i.length * 0.75)
    : r.includes(n.replace(/\s/g, ""));
}

function extractMismatchedTitle(e: string, t: string): string {
  const match = String(e || "").match(
    /([A-Za-z][A-Za-z0-9 .'_-]{1,48}?)(?:\s*[._-]?\s*)(?:S\d{1,2}|Seasons?\s*\d{1,2})\b/i,
  );
  if (!match) return "";
  const r = normalizeStr(match[1]);
  if (
    !r ||
    r.length < 3 ||
    /^(web|webdl|webrip|bluray|hdtv|hdrip|complete|pack|english|hindi|dual|multi|download|episode|season|series)$/i.test(
      r,
    ) ||
    titleMatch(r, t) ||
    titleMatch(t, r) ||
    normalizeStr(t)
      .split(" ")
      .filter((w) => w.length > 3)
      .some((w) => r.includes(w))
  ) {
    return "";
  }
  return r;
}

function isPossibleWrongFile(
  item: { name?: string; tags?: string[]; url?: string },
  target: { title?: string; season?: number | string; episode?: number | string; type?: string },
): boolean {
  if (!target) return false;
  const isSeries =
    target.type === "series" || target.season != null || target.episode != null;
  const text = [item.name, ...(item.tags || []), item.url].filter(Boolean).join(" ");
  if (!text.trim()) return false;

  const parsed = parseSeasonEpisodes(text);
  const withEpisode = parsed.filter(
    (e) => e.episode != null || (e.epFrom != null && e.epTo != null),
  );
  const withSeason = parsed.filter((e) => e.season != null);

  if (isSeries) {
    const n = target.season == null ? null : Number(target.season);
    const r = target.episode == null ? null : Number(target.episode);
    const title = target.title || "";

    const matchesTarget = (e: {
      season: number | null;
      episode?: number;
      epFrom?: number;
      epTo?: number;
    }) => {
      if (n != null && e.season != null && Number(e.season) !== n) return false;
      if (e.episode == null) {
        if (e.epFrom != null && e.epTo != null) {
          return r == null || (r >= e.epFrom && r <= e.epTo);
        }
        return true;
      }
      return r == null || Number(e.episode) === r;
    };

    if (r != null && withEpisode.length > 0) {
      if (!withEpisode.some(matchesTarget)) return true;
    } else if (r != null && withSeason.length > 0 && withEpisode.length === 0) {
      if (n != null && !withSeason.some((e) => Number(e.season) === n)) return true;
    } else if (n != null && withSeason.length > 0 && withEpisode.length === 0) {
      if (!withSeason.some((e) => Number(e.season) === n)) return true;
    } else if (
      n != null &&
      withEpisode.length > 0 &&
      r == null &&
      withEpisode.every((e) => e.season != null && Number(e.season) !== n)
    ) {
      return true;
    }

    if (title && (n != null || r != null) && withSeason.length > 0) {
      if (!titleMatch(text, title) && Boolean(extractMismatchedTitle(text, title))) {
        return true;
      }
    }
  } else {
    // If requesting a movie, but the file explicitly has S01E02 or Season 2 info
    if (withEpisode.length > 0 || withSeason.length > 0) return true;
  }

  return false;
}

function extractQuality(tags: string[], name: string): string | undefined {
  const all = [...(tags || []), name].join(" ");
  if (/2160p|4k|uhd/i.test(all)) return "2160";
  if (/1080p/i.test(all)) return "1080";
  if (/720p/i.test(all)) return "720";
  if (/480p/i.test(all)) return "480";
  if (/360p/i.test(all)) return "360";
  return undefined;
}

function extractType(url: string, name: string): string {
  if (/\.mp4($|\?)/i.test(url) || /\.mp4/i.test(name)) return "mp4";
  if (/\.m3u8($|\?)/i.test(url)) return "m3u8";
  return "mkv";
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    let params: any = {};
    try {
      params = JSON.parse(link);
    } catch {
      params = {};
    }

    const isSeries =
      params.type === "series" ||
      type === "series" ||
      Boolean(params.season || params.episode);

    let payload: any;
    if (isSeries) {
      payload = {
        mode: "episode",
        title: params.title || "",
        year: params.year ? params.year.toString().slice(0, 4) : undefined,
        tmdb_id: params.tmdbId ? parseInt(params.tmdbId, 10) : undefined,
        imdb_id: params.imdbId || undefined,
        season: params.season ? parseInt(params.season, 10) : undefined,
        episode: params.episode ? parseInt(params.episode, 10) : undefined,
      };
    } else {
      payload = {
        mode: "movie",
        title: params.title || "",
        year: params.year ? params.year.toString().slice(0, 4) : undefined,
        tmdb_id: params.tmdbId ? parseInt(params.tmdbId, 10) : undefined,
        imdb_id: params.imdbId || undefined,
      };
    }

    const headers = {
      accept: "application/x-ndjson",
      "accept-language": "en-US,en;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://downloadeverythingfromeverywhere.com",
      pragma: "no-cache",
      referer: "https://downloadeverythingfromeverywhere.com/",
      "user-agent":
        providerContext.commonHeaders?.["User-Agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "x-defe-manual": "1",
    };

    const res = await providerContext.axios.post(
      "https://slave.downloadeverythingfromeverywhere.com/",
      payload,
      {
        headers,
        responseType: "text",
        signal,
        timeout: 45000,
      },
    );

    const rawData =
      typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    const lines = rawData.split("\n").filter((l: string) => l.trim().length > 0);

    const streams: Stream[] = [];
    const seenUrls = new Set<string>();

    const target = {
      title: params.title || "",
      season: params.season,
      episode: params.episode,
      type: isSeries ? "series" : "movie",
    };

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.t === "hit" && Array.isArray(json.links)) {
          const site = json.site || "Direct";
          for (const item of json.links) {
            const url = item.url;
            if (!url || seenUrls.has(url)) continue;

            // Exclude possible wrong files
            if (isPossibleWrongFile({ name: item.name, tags: item.tags, url }, target)) {
              continue;
            }

            if (isDirectLink(url)) {
              seenUrls.add(url);
              const quality = extractQuality(item.tags, item.name);
              const fileType = extractType(url, item.name);
              const name = item.name || item.release || "Stream";
              const server = `${site} - ${name}`;

              const QUALITY_TAG_REGEX =
                /^(2160p?|1080p?|720p?|540p?|480p?|400p?|360p?|4k|uhd)$/i;

              const cleanTags = (item.tags || []).filter(
                (t: string) =>
                  t &&
                  !["Movie", "Episode", site, "Direct"].includes(t) &&
                  !t.toLowerCase().includes("telegram") &&
                  !QUALITY_TAG_REGEX.test(t.trim()) &&
                  (!quality ||
                    (t.trim().toLowerCase() !== quality.toLowerCase() &&
                      t.trim().toLowerCase() !== (quality + "p").toLowerCase())),
              );

              streams.push({
                server,
                link: url,
                type: fileType,
                quality,
                tags: cleanTags,
                tag: cleanTags.join(" • ") || undefined,
              });
            }
          }
        }
      } catch {}
    }

    // Helper to identify a111477 links
    const isA111477 = (s: Stream) =>
      /111477/i.test(s.server) ||
      /111477/i.test(s.link) ||
      Boolean(s.tags?.some((t) => /111477/i.test(t)));

    // Sort streams by resolution (2160p -> 1080p -> 720p -> 480p)
    const qualityWeight = (q?: string) => {
      switch (q) {
        case "2160":
          return 4;
        case "1080":
          return 3;
        case "720":
          return 2;
        case "480":
          return 1;
        default:
          return 0;
      }
    };

    const regularStreams: Stream[] = [];
    const a111477Streams: Stream[] = [];

    for (const stream of streams) {
      if (isA111477(stream)) {
        a111477Streams.push(stream);
      } else {
        regularStreams.push(stream);
      }
    }

    regularStreams.sort((a, b) => qualityWeight(b.quality) - qualityWeight(a.quality));
    a111477Streams.sort((a, b) => qualityWeight(b.quality) - qualityWeight(a.quality));

    return [...regularStreams, ...a111477Streams];
  } catch (err) {
    console.error("Everything getStream error:", err);
    return [];
  }
};
