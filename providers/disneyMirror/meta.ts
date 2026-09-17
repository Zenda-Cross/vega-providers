import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const parts = link.split("|");
  const id = parts[0];
  const typeHint = parts[1] || "movie";

  let title = "";
  let synopsis = "";
  let image = "";
  let cast: string[] = [];
  const tags: string[] = [];
  const linkList: Link[] = [];
  const type = typeHint === "tv" ? "series" : "movie";

  try {
    const endpoint =
      typeHint === "tv"
        ? `https://api2.imdb3.shop/api/tv/${id}`
        : `https://api2.imdb3.shop/api/movie/${id}`;

    const res = await axios.get(endpoint, {
      headers: {
        Referer: "https://officialmoviebox.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const data = res.data?.results?.[0];
    if (data) {
      title = (data.title || "").trim();
      synopsis = data.dis || "";
      image = data.backdrop_path || "";
      if (data.release_date) tags.push(data.release_date);
      if (data.country) tags.push(data.country);

      if (Array.isArray(data.stafflist)) {
        cast = data.stafflist.map((s: any) => s.name).filter(Boolean);
      }

      if (type === "series" && Array.isArray(data.season) && data.season.length > 0) {
        data.season.forEach((s: any) => {
          const seNum = s.se || 1;
          linkList.push({
            title: `Season ${seNum}`,
            episodesLink: `${id}|${seNum}|${s.ep || 8}`,
          });
        });
      } else {
        linkList.push({
          title: title || "Movie",
          directLinks: [
            {
              title: "Movie",
              link: `${id}|0|0`,
              type: "movie",
            },
          ],
        });
      }
    }
  } catch (err) {
    console.error("disneyMirror getMeta error:", err);
  }

  if (linkList.length === 0) {
    linkList.push({
      title: title || "Movie",
      directLinks: [
        {
          title: "Movie",
          link: `${id}|0|0`,
          type: "movie",
        },
      ],
    });
  }

  return {
    title: title || "Unknown Title",
    synopsis: synopsis || "",
    image: image || "",
    imdbId: "",
    type,
    cast: cast.length > 0 ? cast : undefined,
    tags: tags.length > 0 ? tags : undefined,
    linkList,
  };
};
