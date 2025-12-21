import { Info, ProviderContext } from "../types";

const API_BASE = "https://9aniwatch-b.vercel.app/api/v2/hianime/anime";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "series",
    linkList: [],
  };

  try {
    // --------------------------------------------------
    // 🔑 EXTRACT ANIME ID FROM LINK
    // https://9aniwatch.to/anime/pokemon-horizons-the-series-18397
    // --------------------------------------------------
    const animeId = link.split("/anime/")[1]?.trim();
    if (!animeId) return empty;

    // --------------------------------------------------
    // 🔗 API CALL
    // --------------------------------------------------
    const res = await axios.get(`${API_BASE}/${animeId}`);
    const data = res?.data?.data;
    if (!data?.anime?.info) return empty;

    const infoApi = data.anime.info;
    const moreInfo = data.anime.moreInfo;
    const seasons = data.seasons || [];

    // --------------------------------------------------
    // 🧠 META INFO
    // --------------------------------------------------
    const info: Info = {
      title: infoApi.name || "",
      synopsis: infoApi.description || "",
      image: infoApi.poster || "",
      imdbId: "",
      type: "series",
      linkList: [],
    };

    // --------------------------------------------------
    // 📺 SEASONS → linkList
    // episodesLink = season id (IMPORTANT)
    // --------------------------------------------------
    for (const season of seasons) {
      info.linkList.push({
        title: season.title || season.name,
        quality: season.isCurrent ? "Current Season" : "Season",
        episodesLink: season.id, // 👈 SEASON ID APPEARS HERE
        directLinks: [],
      });
    }

    // --------------------------------------------------
    // 🛟 FALLBACK (NO SEASONS)
    // --------------------------------------------------
    if (info.linkList.length === 0) {
      info.linkList.push({
        title: "Season 1",
        quality: "Season 1",
        episodesLink: animeId,
        directLinks: [],
      });
    }

    return info;
  } catch (err: any) {
    console.log("meta api error:", err?.message || err);
    return empty;
  }
};
