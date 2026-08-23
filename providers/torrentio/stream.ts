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

    if (kv) {
      const customUrl = await kv.get<string>("customInstanceUrl");
      if (customUrl && customUrl.trim()) baseUrl = customUrl.trim().replace(/\/+$/, "");
      debridService = (await kv.get<string>("debridService")) || "none";
      debridApiKey = ((await kv.get<string>("debridApiKey")) || "").trim();
      qualityFilter = (await kv.get<string>("qualityFilter")) || "all";
      sortBy = (await kv.get<string>("sortBy")) || "qualitythenseeders";
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
        const language = getLanguageCodes(title);
        const size = title.match(/💾\s*([\d.]+\s*(?:KB|MB|GB|TB))/i)?.[1] || "";
        const uploader = title.match(/⚙️\s*([^\n]+)/)?.[1]?.trim() || "";

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

        // Extract format tags (DV, HDR, Remux)
        const formatTags: string[] = [];
        const fullTitle = `${s.name || ""} ${title}`;
        if (/[\b\s.]DV[\b\s.]|Dolby\s*Vision/i.test(fullTitle)) formatTags.push("DV");
        if (/[\b\s.]HDR(?:10(?:\+)?)?[\b\s.]/i.test(fullTitle)) formatTags.push("HDR");
        if (/REMUX/i.test(fullTitle)) formatTags.push("Remux");

        const tagStr = formatTags.join("/");

        const serverParts: string[] = [];
        if (tagStr) serverParts.push(tagStr);
        if (language && language !== "ENG") serverParts.push(language);
        if (seeders) serverParts.push(seeders);
        if (size) serverParts.push(size);
        serverParts.push(uploader || "Torrentio");

        const serverName = serverParts.join(" •");

        if (link) {
          streams.push({
            server: serverName,
            link: link,
            type: link.startsWith("magnet:") ? "torrent" : "mp4",
            quality: quality,
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
