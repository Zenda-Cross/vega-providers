import { EpisodeLink, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;

  let pageUrl = url;
  let targetSeason = 0;
  let isMovie = false;

  // --- Parse custom URLs ---
  if (url.startsWith("watchanimeworld://movie")) {
    try {
      const u = new URL(url);
      pageUrl = decodeURIComponent(u.searchParams.get("url") || "");
      isMovie = true;
    } catch (e) {
      console.log("getEpisodes: failed to parse movie URL", e);
      return [];
    }
  } else if (url.startsWith("watchanimeworld://season")) {
    try {
      const u = new URL(url);
      pageUrl = decodeURIComponent(u.searchParams.get("url") || "");
      targetSeason = parseInt(u.searchParams.get("season") || "0", 10);
    } catch (e) {
      console.log("getEpisodes: failed to parse season URL", e);
      return [];
    }
  } else {
    // Safety net: detect movie from raw URL path
    if (url.includes("/movies/") || url.includes("/movie/")) {
      isMovie = true;
      pageUrl = url;
    }
  }

  if (!pageUrl) {
    console.log("getEpisodes: missing page URL");
    return [];
  }

  console.log(
    `getEpisodes: fetching ${pageUrl}, ${
      isMovie ? "MOVIE" : `season: ${targetSeason || "all"}`
    }`
  );

  try {
    // ---------- 1. Load the page ----------
    const res = await axios.get(pageUrl, { headers });
    const $ = cheerio.load(res.data);

    const origin = new URL(pageUrl).origin;

    // ==================================================================
    // 🎬 MOVIE — return play button(s)
    // ==================================================================
    if (isMovie) {
      const movieLinks: EpisodeLink[] = [];

      const SERVER_SELECTORS = [
        ".server-list li a",
        ".servers-list li a",
        "ul#player-list li a",
        ".mirror",
        ".play-button a",
        ".player-options li a",
        ".options-list li a",
      ];

      SERVER_SELECTORS.forEach((sel) => {
        $(sel).each((_, el) => {
          const href = $(el).attr("href") || $(el).attr("data-url") || "";
          if (!href) return;
          const full = href.startsWith("http")
            ? href
            : new URL(href, pageUrl).href;
          if (full === pageUrl || full.endsWith("#")) return;
          const label =
            $(el).text().trim() ||
            $(el).attr("title")?.trim() ||
            "Play Movie";
          if (!movieLinks.find((m) => m.link === full)) {
            movieLinks.push({ title: label, link: full });
          }
        });
      });

      if (movieLinks.length === 0) {
        movieLinks.push({ title: "Play", link: pageUrl });
      }

      console.log(`getEpisodes: found ${movieLinks.length} movie links`);
      return movieLinks;
    }

    // ==================================================================
    // 📺 SERIES
    // ==================================================================

    // ✅ FIX 1: Real selector for the season buttons
    const postId =
      $(".season-buttons a.season-btn[data-post]").first().attr("data-post") ||
      $("a.season-btn[data-post]").first().attr("data-post") ||
      $("article.post").attr("id")?.replace("post-", "") ||
      "";

    // ✅ Helper: extract season + episode from a title or num-epi
    const extractEpisodeInfo = (
      titleText: string,
      numEpiText: string
    ): { season: number; episode: number } | null => {
      // First try title: "Show Name 1x3" → season 1, episode 3
      const titleMatch = titleText.match(/(\d+)x(\d+)/);
      if (titleMatch) {
        return {
          season: parseInt(titleMatch[1], 10),
          episode: parseInt(titleMatch[2], 10),
        };
      }
      // Fallback: num-epi is just the episode number
      const epNum = parseInt(numEpiText.trim(), 10);
      if (!isNaN(epNum)) {
        return { season: targetSeason || 1, episode: epNum };
      }
      return null;
    };

    let episodes: EpisodeLink[] = [];

    // ---------- 2. AJAX to fetch the target season ----------
    if (postId && targetSeason) {
      try {
        const ajaxUrl = `${origin}/wp-admin/admin-ajax.php`;

        // ✅ FIX 2: GET request (matches torofilm_Public.url usage in the page JS)
        const ajaxRes = await axios.get(ajaxUrl, {
          params: {
            action: "action_select_season",
            season: targetSeason,
            post: postId,
          },
          headers: {
            ...headers,
            Referer: pageUrl,
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        let ajaxHtml = "";
        const data = ajaxRes.data;
        if (typeof data === "string") {
          ajaxHtml = data;
        } else if (data && typeof data === "object") {
          ajaxHtml = data.data || data.html || data.episodes || "";
          if (typeof ajaxHtml !== "string") ajaxHtml = "";
        }

        if (ajaxHtml.trim()) {
          const $$ = cheerio.load(ajaxHtml);

          // ✅ FIX 3: parse from .entry-title (which contains "1x3")
          $$("li article.episodes, li article.post.episodes").each((_, el) => {
            const $art = $$(el);

            const href =
              $art.find("a.lnk-blk").attr("href") ||
              $art.find("a").first().attr("href");
            if (!href) return;

            const titleText = $art.find("h2.entry-title").text().trim();
            const numEpiText = $art.find(".num-epi").text().trim();

            const info = extractEpisodeInfo(titleText, numEpiText);
            if (!info) return;

            if (targetSeason && info.season !== targetSeason) return;

            episodes.push({
              title: `Episode ${info.episode}`,
              link: href.startsWith("http")
                ? href
                : new URL(href, pageUrl).href,
            });
          });
        }
      } catch (ajaxErr) {
        console.log("getEpisodes: AJAX attempt failed:", ajaxErr);
      }
    }

    // ---------- 3. Fallback: parse the loaded page directly ----------
    if (episodes.length === 0) {
      $("#episode_by_temp li").each((_, el) => {
        const $art = $(el).find("article.episodes, article.post.episodes");
        if (!$art.length) return;

        const href = $art.find("a.lnk-blk").attr("href");
        if (!href) return;

        const titleText = $art.find("h2.entry-title").text().trim();
        const numEpiText = $art.find(".num-epi").text().trim();

        const info = extractEpisodeInfo(titleText, numEpiText);
        if (!info) return;

        if (targetSeason && info.season !== targetSeason) return;

        episodes.push({
          title: `Episode ${info.episode}`,
          link: href.startsWith("http")
            ? href
            : new URL(href, pageUrl).href,
        });
      });
    }

    if (episodes.length === 0) {
      $("a[href*='/episode/']").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const full = href.startsWith("http")
          ? href
          : new URL(href, pageUrl).href;
        const m = full.match(/(\d+)x(\d+)/i) || full.match(/episode[/-](\d+)/i);
        let epNum = 0;
        let sNum = 1;
        if (m) {
          if (m[2]) {
            sNum = parseInt(m[1], 10);
            epNum = parseInt(m[2], 10);
          } else {
            epNum = parseInt(m[1], 10);
          }
        }
        if (targetSeason && sNum && sNum !== targetSeason) return;
        const label = epNum ? `Episode ${epNum}` : $(el).text().trim() || "Episode";
        episodes.push({
          title: label,
          link: full,
        });
      });
    }

    // ---------- 4. Sort by episode number ----------
    episodes.sort((a, b) => {
      const na = parseInt(a.title.match(/\d+/)?.[0] || "0", 10);
      const nb = parseInt(b.title.match(/\d+/)?.[0] || "0", 10);
      return na - nb;
    });

    // Deduplicate
    const seen = new Set<string>();
    episodes = episodes.filter((e) => {
      if (seen.has(e.link)) return false;
      seen.add(e.link);
      return true;
    });

    console.log(
      `getEpisodes: found ${episodes.length} episodes for season ${targetSeason}`
    );
    return episodes;
  } catch (err) {
    console.log("getEpisodes error:", err);
    return [];
  }
};