import { Info, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "series",
    linkList: [],
  };

  try {
    const response = await axios.get(link, { headers });
    const $ = cheerio.load(response.data);

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "series",
      linkList: [],
    };

    // --- Title ---
    result.title =
      $(".dfxb.alg-cr .entry-title").text().trim() ||
      $("h1.entry-title").first().text().trim() ||
      $("h1.post-title").first().text().trim() ||
      $("title").text().trim();

    // --- Poster image ---
    let image =
      $(".dfxb.alg-cr img[alt]").attr("src") ||
      $("figure img").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    result.image = image;

    // --- Synopsis ---
    result.synopsis =
      $(".description p").text().trim() ||
      $(".entry-content p").first().text().trim();

    // ------------------------------------------------------------
    // ✅ PRIMARY: Detect movie vs series from URL path
    // ------------------------------------------------------------
    const isMovie = link.includes("/movies/") || link.includes("/movie/");

    if (isMovie) {
      // ── MOVIE ──────────────────────────────────────────────────
      result.type = "movie";
      result.linkList.push({
        title: result.title || "Play Movie",
        quality: "Movie",
        episodesLink: `watchanimeworld://movie?url=${encodeURIComponent(
          link
        )}`,
        directLinks: [],
      });

      return result;
    }

    // ------------------------------------------------------------
    // ── SERIES ─────────────────────────────────────────────────
    // ------------------------------------------------------------
    result.type = "series";

    const seasonSet = new Set<number>();

    // ✅ 1. Correct selector — season buttons wrapper
    $(".season-buttons a.season-btn").each((_, el) => {
      const s = parseInt($(el).attr("data-season") || "", 10);
      if (!isNaN(s) && s > 0) seasonSet.add(s);
    });

    // ✅ 2. Fallback — older markup with .choose-season
    $(".choose-season .aa-cnt li a").each((_, el) => {
      const s = parseInt($(el).attr("data-season") || "", 10);
      if (!isNaN(s) && s > 0) seasonSet.add(s);
    });

    // ✅ 3. Final fallback — parse "NxM" from the episode titles / links
    $("#episode_by_temp .post.episodes").each((_, el) => {
      const title = $(el).find("h2.entry-title").text().trim();
      const match = title.match(/(\d+)x(\d+)/);
      if (match) seasonSet.add(parseInt(match[1], 10));
    });

    $("a[href*='/episode/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/(\d+)x(\d+)/);
      if (match) seasonSet.add(parseInt(match[1], 10));
    });

    const seasons = Array.from(seasonSet).sort((a, b) => a - b);

    if (seasons.length === 0) {
      // Series page with no seasons detected — treat as a single "series" link
      result.linkList.push({
        title: result.title || "Watch",
        quality: "Series",
        episodesLink: link,
        directLinks: [],
      });
    } else {
      for (const s of seasons) {
        result.linkList.push({
          title: `Season ${s}`,
          quality: `S${s}`,
          episodesLink: `watchanimeworld://season?url=${encodeURIComponent(
            link
          )}&season=${s}`,
          directLinks: [],
        });
      }
    }

    return result;
  } catch (err) {
    console.log("Meta error:", err);
    return empty;
  }
};