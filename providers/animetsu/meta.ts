import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, openWebView, commonHeaders } = providerContext;
    const baseUrl = "https://animetsu.net";
    const url = `${baseUrl}/v2/api/anime/${link}`;

    let cookies: string | undefined;
    let res: any;
    try {
      res = await axios.get(url, {
        headers: { ...commonHeaders, Referer: baseUrl },
      });
    } catch (error: any) {
      if (error.response?.status === 403) {
        const wafResult = await openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass Animetsu anti-bot protection.",
          headers: { ...commonHeaders, Referer: baseUrl },
          force: true,
          waitForCookie: "cf_clearance",
        });
        cookies = wafResult.cookies;
        res = await axios.get(url, {
          headers: { ...commonHeaders, Referer: baseUrl, Cookie: cookies },
        });
      } else {
        throw error;
      }
    }
    const data = res.data;

    const meta = {
      title:
        data.title?.english || data.title?.romaji || data.title?.native || "",
      synopsis: data.description || "",
      image:
        data.cover_image?.large ||
        data.cover_image?.medium ||
        data.cover_image?.small ||
        "",
      tags: [data?.format, data?.status, ...(data?.genres || [])].filter(
        Boolean,
      ),
      imdbId: "",
      type: data.format === "MOVIE" ? "movie" : "series",
    };

    const linkList: Link[] = [];

    const seasons = data.seasons;
    if (seasons && seasons.length > 0) {
      await Promise.all(
        seasons.map(async (season: any) => {
          const seasonTitle =
            season.title?.english ||
            season.title?.romaji ||
            season.title?.native;
          const directLinks: Link["directLinks"] = [];

          try {
            const epsRes = await axios.get(
              `${baseUrl}/api/anime/eps/${season.id}`,
              {
                headers: {
                  ...commonHeaders,
                  Referer: baseUrl,
                  ...(cookies ? { Cookie: cookies } : {}),
                },
              },
            );
            const episodes = epsRes.data;
            if (episodes && episodes.length > 0) {
              episodes.forEach((ep: any) => {
                directLinks.push({
                  title: `Episode ${ep.number}`,
                  link: `${season.id}:${ep.number}`,
                });
              });
            }
          } catch {
            // fallback: use total_eps count
            const total = season.total_eps || 1;
            for (let i = 1; i <= total; i++) {
              directLinks.push({
                title: `Episode ${i}`,
                link: `${season.id}:${i}`,
              });
            }
          }

          if (directLinks.length > 0) {
            linkList.push({
              title: seasonTitle || meta.title,
              directLinks,
            });
          }
        }),
      );
    } else {
      // Movie or single-season fallback
      const total = data.total_eps || 1;
      const directLinks: Link["directLinks"] = [];
      for (let i = 1; i <= total; i++) {
        directLinks.push({
          title: total === 1 ? "Movie" : `Episode ${i}`,
          link: `${link}:${i}`,
        });
      }
      linkList.push({ title: meta.title, directLinks });
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
