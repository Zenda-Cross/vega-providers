import { Info, ProviderContext } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchAllEpisodes(
  animeId: string,
  axios: any
): Promise<{ title: string; link: string; type: "series" }[]> {
  const episodesList: { title: string; link: string; type: "series" }[] = [];
  let page = 1;
  let maxPage = 1;

  const headers = {
    "User-Agent": USER_AGENT,
    "Referer": "https://www.desidubanime.me/",
  };

  try {
    do {
      const url = `https://www.desidubanime.me/wp-admin/admin-ajax.php?action=get_episodes&anime_id=${animeId}&page=${page}&order=asc`;
      const res = await axios.get(url, { headers });
      const data = res.data;

      if (data && data.success && data.data) {
        const episodes = data.data.episodes || [];
        episodes.forEach((ep: any) => {
          const numberStr = ep.number || "";
          const titleStr = ep.title || "";
          const displayTitle = numberStr && titleStr ? `${numberStr} - ${titleStr}` : numberStr || titleStr || "Episode";

          episodesList.push({
            title: displayTitle.trim(),
            link: `${ep.url}*episode`,
            type: "series",
          });
        });

        maxPage = data.data.max_episodes_page || 1;
        page++;
      } else {
        break;
      }
    } while (page <= maxPage);
  } catch (err) {
    console.error(`Error fetching episodes for animeId ${animeId}:`, err);
  }

  return episodesList;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const headers = { "User-Agent": USER_AGENT };

    // 1. Fetch watch page to find details page URL
    const watchRes = await axios.get(link, { headers });
    const watchHtml = watchRes.data || "";
    const $watch = cheerio.load(watchHtml);

    let detailsUrl = $watch('a[href*="/anime/"]').first().attr("href") || "";
    if (!detailsUrl) {
      detailsUrl = link;
    }

    // 2. Fetch anime details page
    const detailsRes = await axios.get(detailsUrl, { headers });
    const html = detailsRes.data || "";
    const $ = cheerio.load(html);

    const title = $("h1 span.anime").first().text().trim() || $("h1").text().trim() || "Anime Details";
    const synopsis = $("div[data-synopsis] p").text().trim() || $("div.prose p").text().trim() || "";
    
    // Find poster image
    let image = $('img[src*="cdn.myanimelist.net/images/anime"]').first().attr("src") || "";
    if (!image) {
      image = $("img.anime-main-image").first().attr("src") || "";
    }
    if (!image) {
      image = $("img.object-cover").first().attr("src") || "";
    }

    // Extract main postId
    let postId = $("input#comment_post_ID").val() || "";
    if (!postId) {
      const match = html.match(/"postId"\s*:\s*"(\d+)"/);
      if (match) postId = match[1];
    }

    const seasons: { id: string; title: string }[] = [];

    // Extract seasons from buttons
    $("#seasonButtonsContainer button").each((_, el) => {
      const seasonId = $(el).attr("data-season") || "";
      const seasonTitle = $(el).text().trim() || "Season";
      if (seasonId) {
        seasons.push({ id: seasonId, title: seasonTitle });
      }
    });

    // Fallback: If no season buttons, use main postId
    if (seasons.length === 0 && postId) {
      seasons.push({ id: String(postId), title: "Season 1" });
    }

    // Fetch episodes for all seasons in parallel
    const linkList = await Promise.all(
      seasons.map(async (s) => {
        const episodes = await fetchAllEpisodes(s.id, axios);
        return {
          title: s.title,
          directLinks: episodes,
        };
      })
    );

    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type: "series",
      linkList,
    };
  } catch (err) {
    console.error("DesiDubAnime getMeta error:", err);
    return {
      title: "Anime Details",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "series",
      linkList: [],
    };
  }
};
