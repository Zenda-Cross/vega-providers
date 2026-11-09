import { Info, Link, ProviderContext } from "../types";
import { API_BASE, commonHeaders, withKartoonsAuth } from "./headers";

interface ParsedLink {
  type: "show" | "movie";
  id: string;
  slug?: string;
}

async function resolveLink(
  link: string,
  axios: ProviderContext["axios"],
): Promise<ParsedLink> {
  // If JSON format
  if (link.startsWith("{")) {
    try {
      const data = JSON.parse(link);
      return {
        type: data.type === "movie" ? "movie" : "show",
        id: data.id,
        slug: data.slug,
      };
    } catch {}
  }

  // If web URL format (e.g., https://kartoons.to/show/shin-chan-68170?season=season-1)
  const isShow = link.includes("/show/");
  const isMovie = link.includes("/movie/");
  const type = isMovie ? "movie" : "show";

  const urlObj = new URL(link.startsWith("http") ? link : `https://kartoons.to/${link}`);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  const slugOrId = pathParts[pathParts.length - 1] || "";

  // If 24 hex characters, it's already an _id
  if (/^[a-fA-F0-9]{24}$/.test(slugOrId)) {
    return { type, id: slugOrId };
  }

  // Otherwise search by slug / keywords
  const searchTerm = slugOrId.split("-")[0] || slugOrId;
  const searchUrl = `${API_BASE}/search?q=${encodeURIComponent(searchTerm)}`;
  const searchRes = await axios.get(searchUrl, { headers: commonHeaders });
  const items = searchRes.data?.data || [];

  const matched =
    items.find((it: any) => it.slug === slugOrId || (it._id || it.id) === slugOrId) ||
    items.find((it: any) => it.type === type);

  if (matched?._id || matched?.id) {
    return { type, id: matched._id || matched.id, slug: matched.slug };
  }

  return { type, id: slugOrId, slug: slugOrId };
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerValue: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios } = await withKartoonsAuth(providerContext);
    const { type, id } = await resolveLink(link, axios);

    if (type === "movie") {
      const res = await axios.get(`${API_BASE}/movie/${id}`, {
        headers: commonHeaders,
      });
      const movie = res.data?.data || res.data;

      const webUrl = movie.slug
        ? `https://kartoons.to/movie/${movie.slug}`
        : `https://kartoons.to/movie/${id}`;

      // coverImage is high-res backdrop; image is portrait poster; hoverImage is transparent logo PNG
      const backdrop = movie.coverImage || movie.image || "";
      const poster = movie.image || movie.coverImage || "";
      const logo = movie.hoverImage || undefined;

      return {
        title: movie.title || "Movie",
        synopsis: movie.description || "",
        image: backdrop,
        poster,
        logo,
        imdbId: "",
        type: "movie",
        tags: Array.isArray(movie.tags) ? movie.tags : [],
        rating: movie.rating ? String(movie.rating) : "",
        webUrl,
        linkList: [
          {
            title: movie.title || "Movie",
            directLinks: [
              {
                title: "Watch Movie",
                link: JSON.stringify({
                  type: "movie",
                  id: movie._id || id,
                  title: movie.title,
                }),
                type: "movie",
                image: poster,
                description: movie.description || "",
              },
            ],
          },
        ],
      };
    }

    // Series / Show
    const res = await axios.get(`${API_BASE}/show/${id}`, {
      headers: commonHeaders,
    });
    const show = res.data?.data || res.data;

    const webUrl = show.slug
      ? `https://kartoons.to/show/${show.slug}`
      : `https://kartoons.to/show/${id}`;

    const backdrop = show.coverImage || show.image || "";
    const poster = show.image || show.coverImage || "";
    const logo = show.hoverImage || undefined;

    const seasons = show.seasons || [];
    const linkList: Link[] = seasons.map((season: any) => ({
      title: season.title || `Season ${season.seasonNumber}`,
      episodesLink: JSON.stringify({
        showId: show._id || id,
        seasonId: season._id,
        seasonNumber: season.seasonNumber,
        slug: season.slug,
      }),
    }));

    return {
      title: show.title || "Show",
      synopsis: show.description || "",
      image: backdrop,
      poster,
      logo,
      imdbId: "",
      type: "series",
      tags: Array.isArray(show.tags) ? show.tags : [],
      rating: show.rating ? String(show.rating) : "",
      webUrl,
      linkList,
    };
  } catch (error: any) {
    throw new Error(`Failed to get meta: ${error?.message || error}`);
  }
};
