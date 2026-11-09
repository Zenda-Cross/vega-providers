import { Stream, ProviderContext, SkipInterval } from "../types";
import { throwProviderError } from "../providerErrors";
import { fetchTheIntroDbSkipTimings } from "../theintrodb";

const languageCodes = [
  ["MULTI", "MULTI"],
  ["DUAL", "DUAL"],
  ["HINDI", "HI"],
  ["TAMIL", "TA"],
  ["TELUGU", "Tz"],
  ["SPANISH", "SP"],
  ["FRENCH", "FR"],
  ["GERMAN", "DE"],
  ["ITALIAN", "IT"],
  ["KOREAN", "KO"],
  ["JAPANESE", "JP"],
  ["ENGLISH", "EN"],
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

  return matches.length > 0 ? [...new Set(matches)].join(", ") : "ENG";
}

const NON_UPLOADER_REGEX =
  /^(\d+|[a-zA-Z]{1,2}|\d{3,4}p?|4k|uhd|bluray|bd|dvd|web(-?dl|-?rip)?|h\.?26[45]|x26[45]|hevc|av1|opus|flac|aac|ac3|dts|mp3|multi(-?audio|-?sub)?|dual(-?audio)?|sub(s|bed)?|dub(bed)?|audio|remux|hdr(10\+?)?|dv|dolby|hi10p?|10bit|8bit|v\d+|repack\d*|proper|raws?|es|lat|ger|ita|fra|eng?|jap?|batch|[0-9a-f]{8})$/i;

const SPEC_WORDS_REGEX =
  /\b(1080p?|720p?|480p?|360p?|2160p?|4k|bd|bluray|hevc|x26[45]|h\.?26[45]|av1|aac|ac3|dts|mp3|flac|opus|dual-audio|multi-audio|sub|dub|web(-?dl|-?rip)?|remux|10-?bit|hi10p?)\b/i;

function isUploaderCandidate(val: string): boolean {
  if (!val || val.length <= 2) return false;
  if (NON_UPLOADER_REGEX.test(val)) return false;
  if (SPEC_WORDS_REGEX.test(val)) return false;
  return true;
}

function extractTorrentioUploader(title: string, name?: string): string {
  const combined = `${name || ""}\n${title || ""}`;
  const lines = combined
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const allBrackets = [...line.matchAll(/\[([a-zA-Z0-9_.\s@-]+)\]/g)].map((m) =>
      m[1].replace(/^@/, "").trim(),
    );
    for (const b of allBrackets) {
      if (isUploaderCandidate(b)) return b;
    }
  }

  for (const line of lines) {
    const cleanTrailing = line
      .replace(/(\s*\[[^\]]*\]|\s*\([^)]*\))+$/g, "")
      .replace(/\.(mkv|mp4|avi|webm|ts)$/i, "")
      .trim();
    const hyphenMatch = cleanTrailing.match(/[-_–]\s*@?([a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)?)$/);
    if (hyphenMatch && isUploaderCandidate(hyphenMatch[1].trim())) {
      return hyphenMatch[1].trim();
    }
  }

  for (const line of lines) {
    const gearMatch = line.match(/⚙️\s*([^\n\r]+)/);
    if (gearMatch) {
      const val = gearMatch[1].replace(/^@/, "").trim();
      if (isUploaderCandidate(val)) return val;
    }
  }

  return "Torrentio";
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
        return { imdbId: id };
      }
    })();

    let imdbId: string = payload.imdbId ?? id ?? "";
    const season: string = payload.season ?? "";
    const episode: string = payload.episode ?? "";
    const effectiveType: string = payload.type ?? type ?? "movie";

    // If ID is not in tt1234567 format, and tmdbId is present but no imdbId, we might fail
    // But autoEmbed usually provides imdbId in payload.
    // If id itself is JSON and we have imdbId, extract it.
    if (!imdbId || imdbId === "undefined" || imdbId === "[object Object]") {
      // fallback if the string itself was passed directly or something
      if (id && id.startsWith("tt")) {
        imdbId = id;
      }
    }

    if (!imdbId || !imdbId.startsWith("tt")) {
      console.warn("torrentio: missing or invalid imdbId in link payload");
      return [];
    }

    const skipTimings = await providerContext.kvStore?.get<boolean>("torrentio_skipTimings");
    const skipTimingsEnabled = skipTimings ?? true;
    let streamSkip: SkipInterval[] | undefined = undefined;
    if (skipTimingsEnabled && effectiveType === "series" && imdbId && season && episode) {
      streamSkip = await fetchTheIntroDbSkipTimings({
        imdbId,
        season: Number(season),
        episode: Number(episode),
        providerContext,
      });
      if (!streamSkip?.length) streamSkip = undefined;
    }

    const kv = providerContext.kvStore;
    let baseUrl = "https://torrentio.strem.fun";
    let debridService = "none";
    let debridApiKey = "";
    let qualityFilter = "all";
    let sortBy = "qualitythenseeders";
    let includeP2PFallback = true;

    if (kv) {
      const customUrl =
        (await kv.get<string>("customInstanceUrl")) ||
        (await kv.get<string>("torrentio_customInstanceUrl"));
      if (customUrl && customUrl.trim()) baseUrl = customUrl.trim().replace(/\/+$/, "");
      debridService =
        (await kv.get<string>("debridService")) ||
        (await kv.get<string>("torrentio_debridService")) ||
        "none";
      debridApiKey = (
        (await kv.get<string>("debridApiKey")) ||
        (await kv.get<string>("torrentio_debridApiKey")) ||
        ""
      ).trim();
      qualityFilter =
        (await kv.get<string>("qualityFilter")) ||
        (await kv.get<string>("torrentio_qualityFilter")) ||
        "all";
      sortBy =
        (await kv.get<string>("sortBy")) ||
        (await kv.get<string>("torrentio_sortBy")) ||
        "qualitythenseeders";
      const fallbackSetting =
        (await kv.get<boolean>("includeP2PFallback")) ??
        (await kv.get<boolean>("torrentio_includeP2PFallback"));
      if (fallbackSetting !== undefined) includeP2PFallback = fallbackSetting;
    }

    const optionsParts: string[] = [];
    if (sortBy && sortBy !== "qualitythenseeders") {
      optionsParts.push(`sort=${sortBy}`);
    }
    if (qualityFilter && qualityFilter !== "all") {
      optionsParts.push(`qualityfilter=${qualityFilter}`);
    }
    if (debridService && debridService !== "none" && debridApiKey) {
      optionsParts.push(`${debridService}=${debridApiKey}`);
      if (!includeP2PFallback) {
        optionsParts.push("debridoptions=nodownloadlinks");
      }
    }

    const optionsSegment = optionsParts.length > 0 ? `${optionsParts.join("|")}/` : "";

    // Torrentio API format
    let url = `${baseUrl}/${optionsSegment}stream/${effectiveType}/${imdbId}`;
    if (effectiveType === "series" && season && episode) {
      url += `:${season}:${episode}`;
    }
    url += `.json`;

    console.log("Torrentio URL:", url);

    const res = await providerContext.axios.get(url, {
      timeout: 10000,
    });

    const streams: Stream[] = [];
    if (res.data && res.data.streams) {
      res.data.streams.forEach((s: any) => {
        // Extract quality from the name or title if possible, or leave undefined
        let quality: any = undefined;
        const lowerName =
          (s.name || "").toLowerCase() + " " + (s.title || "").toLowerCase();
        if (lowerName.includes("2160") || lowerName.includes("4k"))
          quality = "2160";
        else if (lowerName.includes("1080")) quality = "1080";
        else if (lowerName.includes("720")) quality = "720";
        else if (lowerName.includes("480")) quality = "480";
        else if (lowerName.includes("360")) quality = "360";

        let link = s.url;
        if (!link && s.infoHash) {
          // If no URL is provided, but infoHash is available, construct a magnet link
          link = `magnet:?xt=urn:btih:${s.infoHash}`;
        }

        const title = s.title || "";
        const combinedText = `${s.name || ""} ${title}`;
        const language = getLanguageCodes(title);
        const size = title.match(/💾\s*([\d.]+\s*(?:KB|MB|GB|TB))/i)?.[1] || "";
        const uploader = extractTorrentioUploader(title, s.name);

        let seeders = "";
        const seedersMatch = title.match(/👤\s*(\d+)/);
        if (seedersMatch) {
          seeders = `👤${seedersMatch[1]}`;
        } else {
          const slMatch = title.match(/S:\s*(\d+)/i);
          if (slMatch) {
            seeders = `👤${slMatch[1]}`;
          }
        }

        const formatTags = extractFormatTags(combinedText);

        const debridBadge = (s.name || "").match(
          /\[(RD\+?|AD\+?|PM\+?|TB\+?|DL\+?|OC\+?|RD download|AD download)\]/i,
        )?.[0];
        const isCachedDebrid =
          Boolean(debridBadge && !debridBadge.toLowerCase().includes("download")) ||
          Boolean(link && !link.startsWith("magnet:"));

        const server = debridBadge ? `${debridBadge} ${uploader}` : uploader;

        const tags: string[] = [];
        if (quality) {
          tags.push(`${quality}p`);
        }
        if (seeders && !isCachedDebrid) {
          tags.push(seeders);
        }
        if (debridBadge) {
          tags.push(debridBadge.replace(/[\[\]]/g, ""));
        }
        for (const tag of formatTags) {
          tags.push(tag);
        }
        if (language && language !== "ENG") {
          tags.push(language);
        }
        if (size) {
          tags.push(size);
        }

        const tag = tags.join(" • ") || undefined;

        if (link) {
          streams.push({
            server,
            link,
            type: link.startsWith("magnet:") ? "torrent" : "mp4",
            quality,
            tags: tags.length > 0 ? tags : undefined,
            tag,
            skip: streamSkip,
          });
        }
      });
    }

    const isQualityAllowed = (q?: string) => {
      if (!q) return true;
      if (qualityFilter === "all" || !qualityFilter) return true;
      if (qualityFilter === "720" || qualityFilter === "720p,480p") {
        return q === "720" || q === "480" || q === "360";
      }
      if (qualityFilter === "1080" || qualityFilter === "1080p,720p,480p") {
        return q === "1080" || q === "720" || q === "480" || q === "360";
      }
      if (qualityFilter === "480") {
        return q === "480" || q === "360";
      }
      return true;
    };

    const filteredStreams = streams.filter((s) => isQualityAllowed(s.quality));

    console.log(`Torrentio streams (${filteredStreams.length}/${streams.length} allowed for quality=${qualityFilter}):`, filteredStreams);

    return filteredStreams;
  } catch (err) {
    throwProviderError("Torrentio", "stream", err);
  }
};
