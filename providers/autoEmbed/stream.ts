import { Stream, ProviderContext, TextTracks, SkipInterval } from "../types";
import { fetchTheIntroDbSkipTimings } from "../theintrodb";
import { extractCinejoyStreams } from "../extractors/cinejoy";
import { extractMovyStreams } from "../extractors/movy";
import { extractVidstuckStreams } from "../extractors/vidstuck";

export const getStream = async ({
  link: id,
  type,
  providerContext,
  signal,
  isDownload,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  try {
    const streams: Stream[] = [];
    const payload = (() => {
      try {
        return JSON.parse(id);
      } catch {
        return { tmdbId: id };
      }
    })();

    let tmdbId: string = String(payload.tmdbId ?? payload.id ?? payload.tmdId ?? "");
    let imdbId: string = payload.imdbId ?? "";
    const season: string | number = payload.season || 1;
    const episode: string | number = payload.episode || 1;
    const effectiveType: string = payload.type ?? type ?? "movie";
    const isMovie = effectiveType === "movie";
    let title: string = payload.title ?? "";
    let year: string = (payload.year ? String(payload.year) : "").slice(0, 4);
    let releaseDate: string = payload.releaseDate || payload.date || "";

    // If tmdbId or title/year is missing, resolve via Cinemeta or TMDb proxy
    if (!tmdbId && imdbId) {
      try {
        const cinemetaUrl = `https://v3-cinemeta.strem.io/meta/${isMovie ? "movie" : "series"
          }/${imdbId}.json`;
        const cRes = await providerContext.axios.get(cinemetaUrl, {
          headers: providerContext.commonHeaders,
          timeout: 5000,
          signal,
        });
        const cMeta = cRes.data?.meta;
        if (cMeta) {
          tmdbId = String(cMeta.moviedb_id || "");
          if (!title) title = cMeta.name || "";
          if (!year) year = String(cMeta.year || "").slice(0, 4);
        }
      } catch {
        // ignore fallback error
      }
    }

    if (tmdbId && (!title || !year)) {
      try {
        const detailUrl = `https://db.wecollege.net/3/${isMovie ? "movie" : "tv"
          }/${tmdbId}?append_to_response=external_ids`;
        const dRes = await providerContext.axios.get(detailUrl, {
          headers: {
            Referer: `https://www.movy.sx/`,
            Origin: "https://www.movy.sx",
            ...providerContext.commonHeaders,
          },
          timeout: 4000,
          signal,
        });
        const dData = dRes.data;
        if (dData) {
          if (!title) title = dData.title || dData.name || "";
          if (!year) {
            year = (dData.release_date || dData.first_air_date || "").slice(
              0,
              4
            );
          }
          if (!imdbId) imdbId = dData.external_ids?.imdb_id || "";
          if (!releaseDate) {
            releaseDate = dData.release_date || dData.first_air_date || "";
          }
        }
      } catch {
        // ignore fallback error
      }
    }

    if (!tmdbId) {
      return [];
    }

    // 1. Fetch skip timings in parallel with stream extraction
    const skipPromise = (async (): Promise<SkipInterval[] | undefined> => {
      try {
        const skipTimings = await providerContext.kvStore?.get<boolean>("autoEmbed_skipTimings");
        const skipTimingsEnabled = skipTimings ?? true;
        if (skipTimingsEnabled && !isMovie && (imdbId || tmdbId)) {
          const streamSkip = await fetchTheIntroDbSkipTimings({
            imdbId,
            tmdbId,
            season: Number(season),
            episode: Number(episode),
            providerContext,
          });
          if (streamSkip?.length) return streamSkip;
        }
      } catch {}
      return undefined;
    })();

    // 2. Fetch Cinejoy streams in parallel
    const cinejoyPromise = extractCinejoyStreams({
      tmdbId,
      season: Number(season),
      episode: Number(episode),
      type: effectiveType,
      providerContext,
      signal,
    }).catch((err) => {
      console.log("Cinejoy extraction error in MultiStream:", err);
      return [] as Stream[];
    });

    // 3. Fetch Movy streams in parallel (movy.sx / wecollege.net)
    const movyPromise = extractMovyStreams({
      tmdbId,
      imdbId,
      title,
      year,
      season: Number(season),
      episode: Number(episode),
      type: effectiveType,
      providerContext,
      signal,
    }).catch((err) => {
      console.log("Movy extraction error in MultiStream:", err);
      return [] as Stream[];
    });

    // 4. Fetch Vidstuck streams in parallel (sacdn.hakunaymatata.com / workers.dev)
    const vidstuckPromise = extractVidstuckStreams({
      tmdbId,
      imdbId,
      title,
      year,
      date: releaseDate,
      season: Number(season),
      episode: Number(episode),
      type: effectiveType,
      providerContext,
      signal,
    }).catch((err) => {
      console.log("Vidstuck extraction error in MultiStream:", err);
      return [] as Stream[];
    });

    const [streamSkip, cjStreams, movyStreams, vsStreams] = await Promise.all([
      skipPromise,
      cinejoyPromise,
      movyPromise,
      vidstuckPromise,
    ]);

    (cjStreams || []).forEach((s) => {
      streams.push({ ...s, skip: streamSkip });
    });
    (vsStreams || []).forEach((s) => {
      streams.push({ ...s, skip: streamSkip });
    });
    (movyStreams || []).forEach((s) => {
      streams.push({ ...s, skip: streamSkip });
    });

    const cleanStreams = streams.filter(
      (s) =>
        !s.server.toLowerCase().includes("lisbon") &&
        !s.link.includes("cheaptruckrepairs")
    );

    cleanStreams.sort((a, b) => {
      const aQual = parseInt(a.quality || "0", 10);
      const bQual = parseInt(b.quality || "0", 10);

      if (isDownload) {
        const aDl =
          a.type === "mkv" ||
          a.type === "mp4" ||
          a.server.toLowerCase().includes("download");
        const bDl =
          b.type === "mkv" ||
          b.type === "mp4" ||
          b.server.toLowerCase().includes("download");
        if (aDl && !bDl) return -1;
        if (!aDl && bDl) return 1;

        if (aQual !== bQual) return bQual - aQual;
      } else {
        const aStream = a.type === "m3u8" || a.type === "dash";
        const bStream = b.type === "m3u8" || b.type === "dash";
        if (aStream && !bStream) return -1;
        if (!aStream && bStream) return 1;

        const aTop = a.server.includes("Nebula") || a.server.includes("Andromeda");
        const bTop = b.server.includes("Nebula") || b.server.includes("Andromeda");
        if (aTop && !bTop) return -1;
        if (!aTop && bTop) return 1;

        if (aQual !== bQual) return bQual - aQual;
      }
      return 0;
    });

    console.log(`MultiStream resolved ${cleanStreams.length} stream(s)`);
    return cleanStreams;
  } catch (err) {
    console.error("autoEmbed getStream error:", err);
    return [];
  }
};
