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
    const baseUrl = "https://backend.animetsu.to";
    const url = `${baseUrl}/api/anime/info/${link}`;

    const res = await axios.get(url, {
      headers: {
        Referer: "https://animetsu.to/",
      },
    });
    const data = res.data;

    const meta = {
      title:
        data.title?.english || data.title?.romaji || data.title?.native || "",
      synopsis: data.description || "",
      image:
        data.coverImage?.extraLarge ||
        data.coverImage?.large ||
        data.coverImage?.medium ||
        "",
      tags: [data?.format, data?.status, ...(data?.genres || [])].filter(
        Boolean
      ),
      imdbId: "",
      type: data.format === "MOVIE" ? "movie" : "series",
    };

    const linkList: Link[] = [];

    // Get episodes data
    try {
      const episodesRes = await axios.get(`${baseUrl}/api/anime/eps/${link}`, {
        headers: {
          Referer: "https://animetsu.to/",
        },
      });
      const episodes = episodesRes.data;

      if (episodes && episodes.length > 0) {
        const directLinks: Link["directLinks"] = [];

        episodes.forEach((episode: any) => {
          const title = `Episode ${episode.number}`;
          const episodeLink = `${link}:${episode.number}`;

          if (episodeLink && title) {
            directLinks.push({
              title,
              link: episodeLink,
            });
          }
        });

        linkList.push({
          title: meta.title,
          directLinks: directLinks,
        });
      } else {
        // Movie case - single episode
        linkList.push({
          title: meta.title,
          directLinks: [
            {
              title: "Movie",
              link: `${link}:1`,
            },
          ],
        });
      }
    } catch (episodeErr) {
      console.error("Error fetching episodes:", episodeErr);
      // Fallback for movie or single episode
      linkList.push({
        title: meta.title,
        directLinks: [
          {
            title: meta.title,
            link: `${link}:1`,
          },
        ],
      });
    }

    return {
      ...meta,
      linkList: linkList,
    };
  } catch (err) {
    console.error("animetsu meta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
