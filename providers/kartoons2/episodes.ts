// episodes.ts
import { EpisodeLink, ProviderContext } from "../types";

const BASE_URL = "https://cd2735efc006-orangestream.baby-beamup.club";

const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  Referer: `${BASE_URL}/`,
};

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;

  try {
    // url format: "series::toonix:123::s=1"  OR  "series::toonix:123::t=all"
    const parts = url.split("::");
    if (parts.length < 2) return [];

    const type = parts[0];
    const id = parts[1].replace(/^v\d+:/, "");
    const extra = parts.slice(2).join("::"); // e.g. "s=1" or "t=all"

    const seasonMatch = extra.match(/s=(\d+)/);
    const seasonFilter = seasonMatch ? Number(seasonMatch[1]) : null;

    const metaUrl = `${BASE_URL}/meta/${encodeURIComponent(
      type,
    )}/${encodeURIComponent(id)}.json`;

    console.log("[orangestream] episodes:", metaUrl, "season:", seasonFilter);
    const res = await axios.get(metaUrl, { headers, timeout: 30_000 });
    let videos: any[] = res.data?.meta?.videos ?? [];

    if (seasonFilter !== null) {
      videos = videos.filter(v => Number(v?.season) === seasonFilter);
    }

    // ─── Map to EpisodeLink ───────────────────────────────────
    const episodes: EpisodeLink[] = videos
      .map(v => ({
        title:
          v?.title ||
          (v?.season != null && v?.episode != null
            ? `S${v.season}E${v.episode}`
            : "Episode"),
        // Each episode's link goes straight into /stream/{type}/{id}
        link: `${type}::${v?.id ?? ""}`,
        season: v?.season,
        episode: v?.episode,
      }))
      .filter(e => !!e.link.replace(/^[^:]+::/, ""));

    return episodes;
  } catch (err: any) {
    console.error("[orangestream] getEpisodes error:", err?.message ?? err);
    return [];
  }
};