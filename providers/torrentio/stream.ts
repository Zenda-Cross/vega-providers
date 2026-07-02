import { Stream, ProviderContext } from "../types";

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
        const lowerName = (s.name || "").toLowerCase() + " " + (s.title || "").toLowerCase();
        if (lowerName.includes("2160") || lowerName.includes("4k")) quality = "2160";
        else if (lowerName.includes("1080")) quality = "1080";
        else if (lowerName.includes("720")) quality = "720";
        else if (lowerName.includes("480")) quality = "480";
        else if (lowerName.includes("360")) quality = "360";

        let link = s.url;
        if (!link && s.infoHash) {
          // If no URL is provided, but infoHash is available, construct a magnet link
          link = `magnet:?xt=urn:btih:${s.infoHash}`;
        }

        let language = "English";
        const flagsMatch = (s.title || "").match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g);
        if (flagsMatch && flagsMatch.length > 0) {
          language = Array.from(new Set(flagsMatch)).join(" ");
        } else {
          const titleUpper = (s.title || "").toUpperCase();
          const langs = [];
          if (titleUpper.includes("MULTI")) langs.push("Multi");
          if (titleUpper.includes("DUAL")) langs.push("Dual");
          if (titleUpper.includes("HINDI")) langs.push("Hindi");
          if (titleUpper.includes("TAMIL")) langs.push("Tamil");
          if (titleUpper.includes("TELUGU")) langs.push("Telugu");
          if (titleUpper.includes("SPANISH")) langs.push("Spanish");
          if (titleUpper.includes("FRENCH")) langs.push("French");
          if (titleUpper.includes("GERMAN")) langs.push("German");
          if (titleUpper.includes("ITALIAN")) langs.push("Italian");
          if (titleUpper.includes("KOREAN")) langs.push("Korean");
          if (titleUpper.includes("JAPANESE")) langs.push("Japanese");
          if (titleUpper.includes("DUBBED")) langs.push("Dubbed");
          
          if (langs.length > 0) {
            language = langs.join(", ");
          }
        }

        let seeders = "";
        const seedersMatch = (s.title || "").match(/👤\s*\d+/);
        if (seedersMatch) {
          seeders = seedersMatch[0];
        } else {
          const slMatch = (s.title || "").match(/S:\s*\d+\s*L:\s*\d+/i);
          if (slMatch) {
            seeders = slMatch[0];
          }
        }

        let resolution = quality ? `${quality}p` : "";
        if (s.name && s.name.includes("\n")) {
          resolution = s.name.split("\n")[1].trim();
        }

        let serverName = resolution ? `${resolution} | ${language}` : language;
        if (seeders) {
          serverName += ` | ${seeders}`;
        }

        if (link) {
          streams.push({
            server: serverName,
            link: link,
            type: link.startsWith("magnet:") ? "torrent" : "mp4",
            quality: quality,
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
