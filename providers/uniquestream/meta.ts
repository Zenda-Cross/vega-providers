import { Info, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, commonHeaders } = providerContext;

  try {
    const res = await axios.get(link, { headers: commonHeaders });
    const data = res.data;
    
    // Sometimes the data might be nested or direct depending on the series API
    const series = data.content_id ? data : data.data || data;

    const linkList: any[] = [];
    
    if (series.seasons && series.seasons.length > 0) {
      for (const season of series.seasons) {
        linkList.push({
          title: season.title || `Season ${season.season_number || ""}`.trim(),
          episodesLink: `https://anime.uniquestream.net/api/v1/season/${season.content_id}/episodes?page=1&limit=100&order_by=asc`,
        });
      }
    } else {
      // Fallback if no seasons array but it has episodes
      linkList.push({
        title: "Episodes",
        episodesLink: `https://anime.uniquestream.net/api/v1/season/${series.content_id}/episodes?page=1&limit=100&order_by=asc`,
      });
    }

    let imageUrl = series.image || "";
    if (series.images && Array.isArray(series.images)) {
      const widePoster = series.images.find((img: any) => img.type === "poster_wide");
      if (widePoster && widePoster.url) {
        imageUrl = widePoster.url;
      }
    }

    return {
      title: series.title || "",
      image: imageUrl,
      synopsis: series.description || "",
      imdbId: "",
      type: "series",
      tags: series.genre || [],
      rating: series.rating_avg ? String(series.rating_avg) : "",
      linkList,
    };
  } catch (error) {
    console.error("uniquestream getMeta failed", error);
    return {
      title: "",
      image: "",
      synopsis: "",
      imdbId: "",
      type: "series",
      linkList: [],
    };
  }
};
