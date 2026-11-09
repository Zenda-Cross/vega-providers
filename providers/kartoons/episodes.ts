import { EpisodeLink, ProviderContext } from "../types";
import { API_BASE, commonHeaders, withKartoonsAuth } from "./headers";
import { throwProviderError } from "../providerErrors";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerValue: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios } = await withKartoonsAuth(providerContext);
    let showId = "";
    let seasonId = "";
    let seasonSlug = "";

    if (url.startsWith("{")) {
      try {
        const parsed = JSON.parse(url);
        showId = parsed.showId;
        seasonId = parsed.seasonId;
        seasonSlug = parsed.slug || (parsed.seasonNumber ? `season-${parsed.seasonNumber}` : "");
      } catch {}
    }

    if (!showId || !seasonId) {
      // If full URL was provided e.g. https://kartoons.to/show/slug?season=season-1
      const urlObj = new URL(url.startsWith("http") ? url : `https://kartoons.to/${url}`);
      const slug = urlObj.pathname.split("/").filter(Boolean).pop() || "";
      seasonSlug = urlObj.searchParams.get("season") || "";

      const searchRes = await axios.get(
        `${API_BASE}/search?q=${encodeURIComponent(slug.split("-")[0] || slug)}`,
        { headers: commonHeaders },
      );
      const showItem =
        (searchRes.data?.data || []).find((s: any) => s.slug === slug || (s._id || s.id) === slug) ||
        searchRes.data?.data?.[0];

      if (showItem?._id || showItem?.id) {
        showId = showItem._id || showItem.id;
        const showDetail = await axios.get(`${API_BASE}/show/${showId}`, {
          headers: commonHeaders,
        });
        const seasons = showDetail.data?.data?.seasons || showDetail.data?.seasons || [];
        const matchedSeason =
          seasons.find((s: any) => s.slug === seasonSlug || `season-${s.seasonNumber}` === seasonSlug) ||
          seasons[0];
        seasonId = matchedSeason?._id || "";
        seasonSlug = matchedSeason?.slug || `season-${matchedSeason?.seasonNumber || 1}`;
      }
    }

    if (!showId || !seasonId) {
      return [];
    }

    if (!seasonSlug) {
      const detail = await axios.get(`${API_BASE}/show/${showId}`, {headers:commonHeaders});
      const season = (detail.data?.data?.seasons || []).find((s:any) => (s._id || s.id) === seasonId);
      if (!season) throw new Error("Kartoons season not found. Reopen the show to refresh its seasons.");
      seasonSlug = season.slug || `season-${season.seasonNumber}`;
    }
    const res = await axios.get(
      `${API_BASE}/show/${showId}/season/${encodeURIComponent(seasonSlug)}/episodes`,
      { headers: commonHeaders },
    );

    const episodes = res.data?.data || res.data || [];
    const episodeLinks: EpisodeLink[] = [];

    for (const ep of episodes) {
      const epNum = ep.episodeNumber ?? "";
      const epTitle = ep.title ? `Episode ${epNum}: ${ep.title}` : `Episode ${epNum}`;

      const descParts: string[] = [];
      if (ep.durationMinutes || ep.duration) {
        descParts.push(`${ep.durationMinutes || ep.duration}m`);
      }
      if (ep.description) {
        descParts.push(ep.description);
      }

      episodeLinks.push({
        title: epTitle,
        link: JSON.stringify({
          type: "episode",
          id: ep._id,
          showId,
          seasonId,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
        }),
        image: ep.image || "",
        description: descParts.length > 0 ? descParts.join(" • ") : undefined,
      });
    }

    return episodeLinks;
  } catch (error) {
    throwProviderError("Kartoons", "getEpisodes", error);
  }
};
