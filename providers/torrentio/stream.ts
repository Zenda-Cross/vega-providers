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

        if (link) {
          streams.push({
            server: (s.name || "Torrentio").replace(/\n/g, " "),
            link: link,
            type: link.startsWith("magnet:") ? "torrent" : "mp4",
            quality: quality,
          });
        }
      });
    }

    return streams;
  } catch (err) {
    console.error("Torrentio getStream error:", err);
    return [];
  }
};
