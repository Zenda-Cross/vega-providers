import { Stream, ProviderContext, SkipInterval, TextTracks } from "../types";
import { throwProviderError } from "../providerErrors";
import { fetchTheIntroDbSkipTimings } from "../theintrodb";
import { fetchAnimeSkipTimings, resolveKitsuIdFromMal } from "../aniskip";

const DEFAULT_TOKEN = "u_mFxNX2Pva_iYMF-kz9CsNA";
const DEFAULT_INSTANCE_URL = "https://animesub.duckdns.org";

const ALL_TORRENT_SOURCES = [
  "nyaa",
  "animetosho",
  "tokyoTosho",
  "eraiRaws",
  "seadex",
  "nekobt",
  "animegarden",
  "tsukihimeDirect",
  "mikan",
  "dmhy",
  "subsplease",
  "anibt",
  "acgrip",
  "knaben",
  "piratebay",
  "torrentgalaxy",
  "torlock",
  "zilean",
  "comet",
  "stremthruTorz",
];

const languageCodes = [
  ["MULTI", "MULTI"],
  ["DUAL", "DUAL"],
  ["JAPANESE", "JP"],
  ["ENGLISH", "EN"],
  ["HINDI", "HI"],
  ["TAMIL", "TA"],
  ["TELUGU", "TE"],
  ["SPANISH", "ES"],
  ["FRENCH", "FR"],
  ["GERMAN", "DE"],
  ["ITALIAN", "IT"],
  ["KOREAN", "KO"],
  ["CHINESE", "ZH"],
  ["PORTUGUESE", "PT"],
  ["RUSSIAN", "RU"],
] as const;

function getLanguageCodes(title: string): string {
  const flagCodes = (
    title.match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g) || []
  ).map((flag: string) =>
    [...flag]
      .map((character) =>
        String.fromCharCode(65 + character.codePointAt(0)! - 0x1f1e6),
      )
      .join(""),
  );

  if (flagCodes.length > 0) {
    const unique = [...new Set(flagCodes)];
    if (unique.length > 2) return "MULTI";
    return unique.join(", ");
  }

  const uppercaseTitle = title.toUpperCase();
  const matches = languageCodes
    .filter(([language]) => uppercaseTitle.includes(language))
    .map(([, code]) => code);

  return matches.length > 0 ? [...new Set(matches)].join(", ") : "JA/EN";
}

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return "";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function extractQuality(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("2160") || lower.includes("4k")) return "2160";
  if (lower.includes("1080")) return "1080";
  if (lower.includes("720")) return "720";
  if (lower.includes("480")) return "480";
  if (lower.includes("360")) return "360";
  return undefined;
}

function extractFormatTags(text: string): string[] {
  const tags: string[] = [];
  if (/AV1/i.test(text)) tags.push("AV1");
  else if (/x265|HEVC/i.test(text)) tags.push("HEVC");
  else if (/x264|AVC/i.test(text)) tags.push("AVC");

  if (/10-?bit|hi10p?/i.test(text)) tags.push("10-bit");
  if (/[\b\s.]DV[\b\s.]|Dolby\s*Vision/i.test(text)) tags.push("DV");
  if (/[\b\s.]HDR(?:10(?:\+)?)?[\b\s.]/i.test(text)) tags.push("HDR");
  if (/REMUX/i.test(text)) tags.push("Remux");
  if (/BluRay|BD\b|BDRip/i.test(text)) tags.push("BluRay");
  else if (/WEB-?DL|WEBRip/i.test(text)) tags.push("WEB-DL");
  if (/Dual[\s-]Audio/i.test(text)) tags.push("Dual-Audio");
  else if (/Multi[\s-]Audio/i.test(text)) tags.push("Multi-Audio");

  return tags;
}

function extractSeeders(text: string, s?: any): { label: string; count: number } {
  if (typeof s?.seeders === "number" && s.seeders >= 0) {
    return { label: `👤${s.seeders}`, count: s.seeders };
  }
  if (typeof s?.behaviorHints?.seeders === "number" && s.behaviorHints.seeders >= 0) {
    return { label: `👤${s.behaviorHints.seeders}`, count: s.behaviorHints.seeders };
  }
  const seedersMatch =
    text.match(/👤\s*(\d+)/) ||
    text.match(/\bS:\s*(\d+)/i) ||
    text.match(/(\d+)\s*(?:seeds?|seeders?)/i);
  if (seedersMatch) {
    const count = parseInt(seedersMatch[1], 10);
    return { label: `👤${count}`, count };
  }
  return { label: "", count: 0 };
}

function extractSizeBytes(text: string, s?: any): { label: string; bytes: number } {
  const rawBytes = s?.behaviorHints?.videoSize || s?.behaviorHints?.fileSize || s?.size;
  if (typeof rawBytes === "number" && rawBytes > 0) {
    return { label: formatBytes(rawBytes), bytes: rawBytes };
  }
  const match = text.match(/(?:💾\s*)?([\d.]+)\s*(KB|MB|GB|TB)\b/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multiplier =
      unit === "TB"
        ? 1024 * 1024 * 1024 * 1024
        : unit === "GB"
          ? 1024 * 1024 * 1024
          : unit === "MB"
            ? 1024 * 1024
            : 1024;
    return { label: `${match[1]} ${unit}`, bytes: val * multiplier };
  }
  return { label: "", bytes: 0 };
}

function fileSizeBytes(s: any): number {
  const value = s?.behaviorHints?.fileSize ?? s?.fileSize;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function torrentHash(s: any): string {
  return String(s.infoHash || s.url?.match(/urn:btih:([a-f0-9]{40})/i)?.[1] || "").toLowerCase();
}

function filename(s: any): string {
  return String(s.behaviorHints?.filename || "").split(/[\\/]/).pop()?.trim().toLowerCase() || "";
}

async function getEpisodeFileSizes(
  streams: any[], imdbId: string, season: string, episode: string,
  providerContext: ProviderContext,
): Promise<Map<any, {label: string; bytes: number}>> {
  const sizes = new Map<any, {label: string; bytes: number}>();
  for (const stream of streams) {
    const bytes = fileSizeBytes(stream);
    if (bytes) sizes.set(stream, {label: formatBytes(bytes), bytes});
  }
  if (!/^tt\d+$/.test(imdbId) || !/^\d+$/.test(season) || !/^\d+$/.test(episode)) return sizes;
  if (!streams.some(s => torrentHash(s) && !sizes.has(s))) return sizes;
  try {
    // AnimeSub's videoSize and description can contain the whole pack size.
    // Torrentio reports per-file sizes. Use only the same hash AND file identity.
    const response = await providerContext.axios.get(
      `https://torrentio.strem.fun/stream/series/${imdbId}:${season}:${episode}.json`,
      {headers: providerContext.commonHeaders, timeout: 5000},
    );
    const candidates: any[] = Array.isArray(response.data?.streams) ? response.data.streams : [];
    for (const stream of streams) {
      if (sizes.has(stream)) continue;
      const hash = torrentHash(stream);
      if (!hash) continue;
      const matches = candidates.filter(candidate => {
        if (torrentHash(candidate) !== hash) return false;
        const index = stream.fileIdx, candidateIndex = candidate.fileIdx;
        if (Number.isInteger(index) && index >= 0 && Number.isInteger(candidateIndex) && candidateIndex >= 0) {
          return index === candidateIndex;
        }
        const name = filename(stream);
        return /\.(mkv|mp4|avi|webm|m4v|ts)$/i.test(name) && name === filename(candidate);
      });
      if (!matches.length) continue;
      const selected = matches[0];
      const size = extractSizeBytes(`${selected.description || ""} ${selected.title || ""}`, selected);
      if (size.bytes > 0) sizes.set(stream, size);
    }
  } catch {
    // Optional enrichment must not hide playable streams or report a pack as a file.
  }
  return sizes;
}

function parseCustomManifest(manifestUrl: string): { baseUrl: string; token: string } | null {
  const clean = manifestUrl.trim().replace(/^stremio:\/\//i, "https://");
  const match = clean.match(/^(https?:\/\/[^\/]+)\/(u_[a-zA-Z0-9_-]+)/);
  if (match) {
    return { baseUrl: match[1], token: match[2] };
  }
  return null;
}

async function registerDebridConfig(
  instanceUrl: string,
  service: string,
  apiKey: string,
  enableP2P: boolean,
  providerContext: ProviderContext,
): Promise<string | null> {
  try {
    const configUrl = `${instanceUrl}/configure`;
    const getRes = await providerContext.axios.get(configUrl, {
      timeout: 8000,
    });
    const html = getRes.data;
    const $ = providerContext.cheerio.load(html);
    const form = $("#configForm");
    const params = new URLSearchParams();

    form.find("input, select, textarea").each((_: any, el: any) => {
      const name = $(el).attr("name");
      const type = $(el).attr("type");
      const val = $(el).val() || "";

      if (!name) return;
      if (type === "checkbox") {
        if ($(el).prop("checked")) {
          params.append(name, val || "on");
        }
      } else if (type === "radio") {
        if ($(el).prop("checked")) {
          params.append(name, val);
        }
      } else {
        params.append(name, val);
      }
    });

    if (enableP2P) {
      params.set("enableP2P", "on");
      params.delete("hideUncached");
    } else {
      params.delete("enableP2P");
      params.set("hideUncached", "on");
    }

    if (service && service !== "none") {
      params.set("service[]", service);
      params.set("apiKey[]", apiKey);
    }

    for (const src of ALL_TORRENT_SOURCES) {
      if (!params.getAll("torrentSources[]").includes(src)) {
        params.append("torrentSources[]", src);
      }
    }

    const postRes = await providerContext.axios.post(configUrl, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: configUrl,
      },
      timeout: 8000,
    });

    const postHtml =
      typeof postRes.data === "string" ? postRes.data : JSON.stringify(postRes.data);
    const tokenMatch = postHtml.match(/\/(u_[a-zA-Z0-9_-]+)(?:\/manifest\.json|\/stream)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  } catch (err) {
    console.warn("AnimeSub configure registration error:", err);
  }
  return null;
}

async function resolveTokenAndBaseUrl(
  providerContext: ProviderContext,
): Promise<{ baseUrl: string; token: string }> {
  const kv = providerContext.kvStore;
  let customManifestUrl = "";
  let instanceUrl = DEFAULT_INSTANCE_URL;
  let debridService = "none";
  let debridApiKey = "";
  let enableP2P = true;

  if (kv) {
    customManifestUrl =
      (await kv.get<string>("animesub_manifestUrl")) ||
      (await kv.get<string>("customManifestUrl")) ||
      "";
    const inst =
      (await kv.get<string>("animesub_instanceUrl")) ||
      (await kv.get<string>("customInstanceUrl"));
    if (inst?.trim()) instanceUrl = inst.trim().replace(/\/+$/, "");
    debridService =
      (await kv.get<string>("animesub_debridService")) ||
      (await kv.get<string>("debridService")) ||
      "none";
    debridApiKey = (
      (await kv.get<string>("animesub_debridApiKey")) ||
      (await kv.get<string>("debridApiKey")) ||
      ""
    ).trim();
    const p2pVal =
      (await kv.get<boolean>("animesub_enableP2P")) ??
      (await kv.get<boolean>("enableP2P"));
    if (p2pVal !== undefined) enableP2P = p2pVal;
  }

  if (customManifestUrl) {
    const parsed = parseCustomManifest(customManifestUrl);
    if (parsed) return parsed;
  }

  if (debridService !== "none" && debridApiKey) {
    const cacheKey = `animesub_token_${debridService}_${debridApiKey.slice(0, 10)}_${enableP2P}`;
    let cachedToken = await kv?.get<string>(cacheKey);
    if (!cachedToken) {
      cachedToken =
        (await registerDebridConfig(
          instanceUrl,
          debridService,
          debridApiKey,
          enableP2P,
          providerContext,
        )) || undefined;
      if (cachedToken && kv) {
        await kv.set(cacheKey, cachedToken);
      }
    }
    if (cachedToken) {
      return { baseUrl: instanceUrl, token: cachedToken };
    }
  }

  return { baseUrl: instanceUrl, token: DEFAULT_TOKEN };
}

async function fetchKitsuFallbackStreams(
  title: string,
  season: string,
  episode: string,
  baseUrl: string,
  token: string,
  providerContext: ProviderContext,
): Promise<any[]> {
  try {
    const searchTerm =
      season && Number(season) > 1
        ? `${title} Season ${season}`
        : title;
    const kitsuUrl = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTerm)}&page[limit]=1`;
    const res = await providerContext.axios.get(kitsuUrl, { timeout: 5000 });
    const kitsuId = res.data?.data?.[0]?.id;
    if (!kitsuId) return [];

    const epSuffix = episode ? `:${episode}` : "";
    const streamUrl = `${baseUrl}/${token}/stream/anime/kitsu:${kitsuId}${epSuffix}.json`;
    const streamRes = await providerContext.axios.get(streamUrl, { timeout: 10000 });
    return Array.isArray(streamRes.data?.streams) ? streamRes.data.streams : [];
  } catch {
    return [];
  }
}

const NON_UPLOADER_REGEX =
  /^(\d+|[a-zA-Z]{1,2}|\d{3,4}p?|4k|uhd|bluray|bd|dvd|web(-?dl|-?rip)?|h\.?26[45]|x26[45]|hevc|av1|opus|flac|aac|ac3|dts|mp3|multi(-?audio|-?sub)?|dual(-?audio)?|sub(s|bed)?|dub(bed)?|audio|remux|hdr(10\+?)?|dv|dolby|hi10p?|10bit|8bit|v\d+|repack\d*|proper|raws?|es|lat|ger|ita|fra|eng?|jap?|batch|[0-9a-f]{8}|unofficial\s*batch)$/i;

const SPEC_WORDS_REGEX =
  /\b(1080p?|720p?|480p?|360p?|2160p?|4k|bd|bluray|hevc|x26[45]|h\.?26[45]|av1|aac|ac3|dts|mp3|flac|opus|dual-audio|multi-audio|sub|dub|web(-?dl|-?rip)?|remux|10-?bit|hi10p?)\b/i;

function isUploaderCandidate(val: string): boolean {
  if (!val || val.length <= 2) return false;
  if (NON_UPLOADER_REGEX.test(val)) return false;
  if (SPEC_WORDS_REGEX.test(val)) return false;
  return true;
}

function extractUploader(s: any): string {
  const rawSources = [
    s.behaviorHints?.filename,
    s.description,
    s.title,
    s.name,
  ].filter(Boolean);

  const lines: string[] = [];
  for (const raw of rawSources) {
    for (const l of String(raw).split(/\r?\n/)) {
      const trimmed = l.trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  for (const line of lines) {
    const m = line.match(/^\[([a-zA-Z0-9_.\s@-]+)\]/);
    if (m) {
      const val = m[1].replace(/^@/, "").trim();
      if (isUploaderCandidate(val)) return val;
    }
  }

  for (const line of lines) {
    const gearMatch = line.match(/⚙️\s*([^\n\r]+)/);
    if (gearMatch) {
      const val = gearMatch[1].replace(/^@/, "").trim();
      if (isUploaderCandidate(val)) return val;
    }
  }

  for (const line of lines) {
    const cleanTrailing = line
      .replace(/(\s*\[[^\]]*\]|\s*\([^)]*\))+$/g, "")
      .replace(/\.(mkv|mp4|avi|webm|ts)$/i, "")
      .trim();
    const hyphenMatch = cleanTrailing.match(/[-_–]\s*@?([a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)?)$/);
    if (hyphenMatch) {
      const val = hyphenMatch[1].trim();
      if (isUploaderCandidate(val)) return val;
    }
  }

  for (const line of lines) {
    const allBrackets = [...line.matchAll(/\[([a-zA-Z0-9_.\s@-]+)\]/g)].map((m) =>
      m[1].replace(/^@/, "").trim(),
    );
    for (const b of allBrackets) {
      if (isUploaderCandidate(b)) return b;
    }
  }

  return "AnimeSub+";
}

function parseStreamItem(
  s: any,
  streamSkip?: SkipInterval[],
  episodeSize?: {label: string; bytes: number},
): { stream: Stream; seederCount: number; sizeBytes: number } | null {
  const combinedText = `${s.name || ""} ${s.description || ""} ${s.title || ""}`;
  const quality = extractQuality(combinedText);

  let link = s.url;
  if (!link && s.infoHash) {
    const trackers = (s.sources || [])
      .filter((src: string) => src.startsWith("tracker:"))
      .map((src: string) => `tr=${encodeURIComponent(src.replace("tracker:", ""))}`);
    const trackerQuery = trackers.length > 0 ? `&${trackers.join("&")}` : "";
    link = `magnet:?xt=urn:btih:${s.infoHash}${trackerQuery}`;
  }

  if (!link) return null;

  const { label: seedersLabel, count: seederCount } = extractSeeders(combinedText, s);
  const { label: sizeLabel, bytes: sizeBytes } = episodeSize ?? extractSizeBytes(combinedText, s);
  const formatTags = extractFormatTags(combinedText);
  const language = getLanguageCodes(combinedText);

  const debridBadge = (s.name || "").match(
    /\[(RD\+?|AD\+?|PM\+?|TB\+?|DL\+?|EN\+?|RD download|AD download)\]/i,
  )?.[0];
  const isCachedDebrid =
    Boolean(debridBadge && !debridBadge.toLowerCase().includes("download")) ||
    Boolean(link && !link.startsWith("magnet:"));

  const uploader = extractUploader(s);
  const server = debridBadge ? `${debridBadge} ${uploader}` : uploader;

  const tags: string[] = [];
  if (quality) {
    tags.push(`${quality}p`);
  }
  if (seedersLabel && !isCachedDebrid) {
    tags.push(seedersLabel);
  }
  if (debridBadge) {
    tags.push(debridBadge.replace(/[\[\]]/g, ""));
  }
  for (const tag of formatTags) {
    tags.push(tag);
  }
  if (language && language !== "ENG" && language !== "JA/EN") {
    tags.push(language);
  }
  if (sizeLabel) {
    tags.push(sizeLabel);
  }

  const tag = tags.join(" • ") || undefined;

  let subtitles: TextTracks | undefined = undefined;
  if (Array.isArray(s.subtitles) && s.subtitles.length > 0) {
    subtitles = s.subtitles.map((sub: any) => ({
      title: sub.lang || sub.id || "Subtitle",
      language: sub.lang || "en",
      type: sub.url?.endsWith(".vtt") ? "text/vtt" : "application/x-subrip",
      uri: sub.url,
    }));
  }

  return {
    stream: {
      server,
      link,
      type: link.startsWith("magnet:") ? "torrent" : "mp4",
      quality,
      tags: tags.length > 0 ? tags : undefined,
      tag,
      subtitles,
      skip: streamSkip,
    },
    seederCount,
    sizeBytes,
  };
}

function isQualityAllowed(q: string | undefined, qualityFilter: string): boolean {
  if (!q || qualityFilter === "all" || !qualityFilter) return true;
  if (qualityFilter === "720") return q === "720" || q === "480" || q === "360";
  if (qualityFilter === "1080") return q === "1080" || q === "720" || q === "480" || q === "360";
  if (qualityFilter === "480") return q === "480" || q === "360";
  return true;
}

const QUALITY_RANKS: Record<string, number> = {
  "2160": 5,
  "1080": 4,
  "720": 3,
  "480": 2,
  "360": 1,
};

function sortParsedItems(
  items: { stream: Stream; seederCount: number; sizeBytes: number }[],
  sortBy: string,
): Stream[] {
  items.sort((a, b) => {
    if (sortBy === "seeders") {
      return b.seederCount - a.seederCount;
    }
    if (sortBy === "size") {
      return b.sizeBytes - a.sizeBytes;
    }
    const qRankA = QUALITY_RANKS[a.stream.quality || ""] || 0;
    const qRankB = QUALITY_RANKS[b.stream.quality || ""] || 0;
    if (qRankA !== qRankB) {
      return qRankB - qRankA;
    }
    return b.seederCount - a.seederCount;
  });

  return items.map((item) => item.stream);
}

export const getStream = async ({
  link: id,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> => {
  try {
    const payload = (() => {
      try {
        return JSON.parse(id);
      } catch {
        return {
          imdbId: id.startsWith("tt") ? id : undefined,
          kitsuId: id.startsWith("kitsu:") ? id : undefined,
          malId: id.startsWith("mal:") ? id.replace("mal:", "") : undefined,
        };
      }
    })();

    let kitsuId: string =
      payload.kitsuId ?? (typeof id === "string" && id.startsWith("kitsu:") ? id : "");
    let imdbId: string =
      payload.imdbId ?? (typeof id === "string" && id.startsWith("tt") ? id : "");
    const malId: string =
      payload.malId ?? (typeof id === "string" && id.startsWith("mal:") ? id.replace("mal:", "") : "");
    const title: string = payload.title ?? "";
    const season: string = payload.season ?? "";
    const episode: string = payload.episode ?? "";
    const animeEpisode: string = payload.animeEpisode ??
      kitsuId.match(/^kitsu:\d+:(\d+)$/)?.[1] ?? episode;
    const effectiveType: string = payload.type ?? type ?? "series";

    if (!kitsuId && malId) {
      kitsuId = (await resolveKitsuIdFromMal(malId, providerContext)) || "";
    }

    if (!imdbId && !kitsuId && !title) {
      console.warn("AnimeSub: missing imdbId, kitsuId, and title in link payload");
      return [];
    }

    const kv = providerContext.kvStore;
    const skipTimings =
      (await kv?.get<boolean>("animesub_skipTimings")) ??
      (await kv?.get<boolean>("torrentio_skipTimings"));
    const skipTimingsEnabled = skipTimings ?? true;

    let streamSkip: SkipInterval[] | undefined = undefined;
    if (skipTimingsEnabled && effectiveType === "series" && episode) {
      const epNum = Number(episode);
      if (epNum > 0) {
        streamSkip = await fetchAnimeSkipTimings({
          kitsuId,
          malId: malId || undefined,
          title,
          episode: Number(animeEpisode),
          season: Number(season),
          providerContext,
        });

        if ((!streamSkip || streamSkip.length === 0) && imdbId && season) {
          streamSkip = await fetchTheIntroDbSkipTimings({
            imdbId,
            season: Number(season),
            episode: epNum,
            providerContext,
          });
        }
      }
      if (!streamSkip?.length) streamSkip = undefined;
    }

    const { baseUrl, token } = await resolveTokenAndBaseUrl(providerContext);

    const qualityFilter =
      (await kv?.get<string>("animesub_qualityFilter")) ||
      (await kv?.get<string>("qualityFilter")) ||
      "all";
    const sortBy =
      (await kv?.get<string>("animesub_sortBy")) ||
      (await kv?.get<string>("sortBy")) ||
      "qualitythenseeders";

    let rawStreams: any[] = [];

    if (kitsuId) {
      let targetKitsu = kitsuId;
      if (effectiveType === "series" && /^(?:kitsu:)?\d+$/.test(kitsuId) && animeEpisode) {
        targetKitsu = `${kitsuId}:${animeEpisode}`;
      }
      const streamType = effectiveType === "movie" ? "movie" : "anime";
      const kitsuUrl = `${baseUrl}/${token}/stream/${streamType}/${targetKitsu}.json`;
      console.log("AnimeSub Kitsu URL:", kitsuUrl);
      try {
        const res = await providerContext.axios.get(kitsuUrl, { timeout: 12000 });
        if (Array.isArray(res.data?.streams)) {
          rawStreams = res.data.streams;
        }
      } catch {
        rawStreams = [];
      }
    }

    if (rawStreams.length === 0 && imdbId && imdbId.startsWith("tt")) {
      let streamTarget = imdbId;
      if (effectiveType === "series" && season && episode) {
        streamTarget = `${imdbId}:${season}:${episode}`;
      }
      const streamType = effectiveType === "series" ? "series" : "movie";
      const imdbUrl = `${baseUrl}/${token}/stream/${streamType}/${streamTarget}.json`;
      console.log("AnimeSub IMDb URL:", imdbUrl);
      try {
        const res = await providerContext.axios.get(imdbUrl, { timeout: 12000 });
        if (Array.isArray(res.data?.streams)) {
          rawStreams = res.data.streams;
        }
      } catch {
        rawStreams = [];
      }
    }

    if (rawStreams.length === 0 && title) {
      rawStreams = await fetchKitsuFallbackStreams(
        title,
        season,
        episode,
        baseUrl,
        token,
        providerContext,
      );
    }

    const episodeSizes = effectiveType === "series"
      ? await getEpisodeFileSizes(rawStreams, imdbId, season, episode, providerContext)
      : undefined;
    const parsedItems: { stream: Stream; seederCount: number; sizeBytes: number }[] = [];
    for (const s of rawStreams) {
      const parsed = parseStreamItem(s, streamSkip, episodeSizes ? episodeSizes.get(s) || {label: "", bytes: 0} : undefined);
      if (parsed && isQualityAllowed(parsed.stream.quality, qualityFilter)) {
        parsedItems.push(parsed);
      }
    }

    return sortParsedItems(parsedItems, sortBy);
  } catch (err) {
    throwProviderError("AnimeSub", "stream", err);
  }
};
