import { Stream, ProviderContext } from "../types";

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
    return [...new Set(flagCodes)].join(", ");
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

    // Torrentio API format
    let url = `https://torrentio.strem.fun/stream/${effectiveType}/${imdbId}`;
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
        const seedersMatch = title.match(/👤\s*\d+/);
        if (seedersMatch) {
          seeders = seedersMatch[0];
        } else {
          const slMatch = title.match(/S:\s*\d+\s*L:\s*\d+/i);
          if (slMatch) {
            seeders = slMatch[0];
          }
        }

        let resolution = quality ? `${quality}p` : "";
        if (s.name && s.name.includes("\n")) {
          resolution = s.name.split("\n")[1].trim();
        }

        const serverName = [resolution, language, size, uploader, seeders]
          .filter(Boolean)
          .join(" | ");

        if (link) {
          streams.push({
            server: serverName,
            link: link,
            type: link.startsWith("magnet:") ? "torrent" : "mp4",
            // quality: quality,
          });
        }
      });
    }

    console.log("Torrentio streams:", streams);

    return streams;
  } catch (err) {
    console.error("Torrentio getStream error:", err);
    return [];
  }
};
