import { Info, ProviderContext } from "../types";

const DB_BASE = "https://db.1flex.org";

function parseLink(link: string): { id: string; type: string } {
  try {
    if (link.startsWith("{")) {
      const parsed = JSON.parse(link);
      return { id: String(parsed.id), type: parsed.type || "movie" };
    }
    const url = new URL(link);
    const id = url.searchParams.get("id") || "";
    const type = url.searchParams.get("type") || "movie";
    return { id, type };
  } catch {
    const idMatch = link.match(/id=([^&]+)/);
    const typeMatch = link.match(/type=([^&]+)/);
    return {
      id: idMatch ? idMatch[1] : link,
      type: typeMatch ? typeMatch[1] : "movie",
    };
  }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const { id, type } = parseLink(link);
  const isMovie = type === "movie";

  const endpoint = isMovie
    ? `${DB_BASE}/movie/${id}?append_to_response=images,videos,releases,credits,similar`
    : `${DB_BASE}/tv/${id}?append_to_response=images,videos,content_ratings,credits,similar,external_ids`;

  const response = await axios.get(endpoint, {
    headers: {
      ...providerContext.commonHeaders,
      Referer: "https://www.1flex.org/",
      Origin: "https://www.1flex.org",
    },
  });

  const data = response.data;
  if (!data) {
    throw new Error(`Media metadata not found for ID: ${id}`);
  }

  const title = (isMovie ? data.title : data.name) || "Untitled";
  const image = data.poster_path
    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
    : "";
  const rating = data.vote_average
    ? Number(data.vote_average).toFixed(1)
    : undefined;

  if (isMovie) {
    return {
      title,
      synopsis: data.overview || "",
      image,
      poster: image,
      imdbId: data.imdb_id || "",
      type: "movie",
      rating,
      linkList: [
        {
          title: "Movie",
          quality: "1080p",
          directLinks: [
            {
              title: data.title || "Play Movie",
              link: JSON.stringify({ id, type: "movie" }),
              type: "movie",
            },
          ],
        },
      ],
    };
  }

  const seasons: any[] = data.seasons || [];
  return {
    title,
    synopsis: data.overview || "",
    image,
    poster: image,
    imdbId: data.external_ids?.imdb_id || "",
    type: "series",
    rating,
    linkList: seasons
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        title: s.name || `Season ${s.season_number}`,
        episodesLink: JSON.stringify({
          id,
          season: s.season_number,
          type: "tv",
        }),
      })),
  };
};
