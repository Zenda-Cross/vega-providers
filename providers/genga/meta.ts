import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios } = providerContext;
    const res = await axios.get("https://test.blakiteapi.xyz/api/getAllAnime.php");
    const catalogData = res.data?.data || {};
    
    let targetItem: any = null;
    let category: string = "movie";

    // Find the item in the catalog
    for (const cat of ["movies", "series", "dramas"]) {
      const items = catalogData[cat] ? Object.values(catalogData[cat]) : [];
      const found = items.find((item: any) => (item.tmdbId || item.originalTmdbId) === link);
      if (found) {
        targetItem = found;
        category = cat;
        break;
      }
    }

    if (!targetItem) {
      throw new Error(`Item not found in catalog: ${link}`);
    }

    const tmdbData = targetItem.TMDB_DATA || {};
    const title = targetItem.title || "";
    const synopsis = tmdbData.synopsis || "";
    const image = targetItem.IMAGES?.poster || targetItem.IMAGES?.backdrop || "";
    const rating = tmdbData.rating || "";
    const type = category === "movies" ? "movie" : "series";

    const linkList: Link[] = [];

    if (type === "movie") {
      linkList.push({
        title: "Movie",
        directLinks: [
          {
            title: title,
            link: `${link}-1-1`,
            type: "movie",
          },
        ],
      });
    } else {
      const seasons = targetItem.seasons || {};
      Object.keys(seasons).forEach((seasonNum) => {
        const seasonInfo = seasons[seasonNum];
        const totalEpisodes = seasonInfo.totalEpisodes || 1;
        const directLinks: Link["directLinks"] = [];

        for (let ep = 1; ep <= totalEpisodes; ep++) {
          directLinks.push({
            title: `Episode ${ep}`,
            link: `${link}-${seasonNum}-${ep}`,
            type: "series",
          });
        }

        linkList.push({
          title: `Season ${seasonNum}`,
          directLinks,
        });
      });
    }

    return {
      title,
      image,
      synopsis,
      imdbId: "",
      type,
      rating,
      linkList,
    };
  } catch (err) {
    console.error("Genga getMeta error:", err);
    return {
      title: "",
      image: "",
      synopsis: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
