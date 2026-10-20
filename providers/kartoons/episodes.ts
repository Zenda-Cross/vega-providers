import { EpisodeLink, ProviderContext } from "../types";
import { API_BASE, commonHeaders } from "./headers";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerValue: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios } = providerContext;
    let showId = "";
    let seasonId = "";

    if (url.startsWith("{")) {
      try {
        const parsed = JSON.parse(url);
        showId = parsed.showId;
        seasonId = parsed.seasonId;
      } catch {}
    }

    if (!showId || !seasonId) {
      // If full URL was provided e.g. https://kartoons.to/show/slug?season=season-1
      const urlObj = new URL(url.startsWith("http") ? url : `https://kartoons.to/${url}`);
      const slug = urlObj.pathname.split("/").filter(Boolean).pop() || "";
      const seasonSlug = urlObj.searchParams.get("season") || "";

      const searchRes = await axios.get(
        `${API_BASE}/shows?search=${encodeURIComponent(slug.split("-")[0] || slug)}`,
        { headers: commonHeaders },
      );
      const showItem =
        (searchRes.data?.data || []).find((s: any) => s.slug === slug || s._id === slug) ||
        searchRes.data?.data?.[0];

      if (showItem?._id) {
        showId = showItem._id;
        const showDetail = await axios.get(`${API_BASE}/shows/${showId}`, {
          headers: commonHeaders,
        });
        const seasons = showDetail.data?.data?.seasons || showDetail.data?.seasons || [];
        const matchedSeason =
          seasons.find((s: any) => s.slug === seasonSlug || `season-${s.seasonNumber}` === seasonSlug) ||
          seasons[0];
        seasonId = matchedSeason?._id || "";
      }
    }

    if (!showId || !seasonId) {
      return [];
    }

    const res = await axios.get(
      `${API_BASE}/shows/${showId}/season/${seasonId}/all-episodes`,
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
    return [];
  }
};
