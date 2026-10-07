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
    // --- SAFETY NET: Detect movie from the raw URL path ---
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
    // 🎬 MOVIE HANDLING — return play button(s)
    // ==================================================================
    if (isMovie) {
      const movieLinks: EpisodeLink[] = [];

      // Try to find server / player links on the movie page
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

          // Skip anchors / same page
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

      // Fallback: use the movie page itself as a play button
      if (movieLinks.length === 0) {
        movieLinks.push({
          title: "Play",
          link: pageUrl,
        });
      }

      console.log(`getEpisodes: found ${movieLinks.length} movie links`);
      return movieLinks;
    }

    // ==================================================================
    // 📺 SERIES HANDLING (unchanged)
    // ==================================================================
    const postId =
      $(".choose-season .aa-cnt li a[data-post]").first().attr("data-post") ||
      $("article.post").attr("id")?.replace("post-", "") ||
      "";

    let episodes: EpisodeLink[] = [];

    // ---------- 2. AJAX for target season ----------
    if (postId && targetSeason) {
      try {
        const ajaxUrl = `${origin}/wp-admin/admin-ajax.php`;

        const form = new URLSearchParams();
        form.append("action", "action_select_season");
        form.append("post", postId);
        form.append("season", String(targetSeason));

        const ajaxRes = await axios.post(ajaxUrl, form.toString(), {
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded",
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

          $$("li").each((_, el) => {
            const $li = $$(el);
            const article = $li.find("article.episodes");
            const $art = article.length ? article : $li;

            const href =
              $art.find("a.lnk-blk").attr("href") ||
              $art.find("a").first().attr("href");
            if (!href) return;

            const numEpi = $art.find(".num-epi").text().trim();
            const match = numEpi.match(/(\d+)x(\d+)/);
            if (!match) return;

            const season = parseInt(match[1], 10);
            const epNum = parseInt(match[2], 10);

            if (targetSeason && season !== targetSeason) return;

            episodes.push({
              title: `Episode ${epNum}`,
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

    // ---------- 3. Fallback: parse from loaded page ----------
    if (episodes.length === 0) {
      $("#episode_by_temp li").each((_, el) => {
        const article = $(el).find("article.episodes");
        if (!article.length) return;

        const href = article.find("a.lnk-blk").attr("href");
        if (!href) return;

        const numEpi = article.find(".num-epi").text().trim();
        const match = numEpi.match(/(\d+)x(\d+)/);
        if (!match) return;

        const season = parseInt(match[1], 10);
        const epNum = parseInt(match[2], 10);

        if (targetSeason && season !== targetSeason) return;

        episodes.push({
          title: `Episode ${epNum}`,
          link: href.startsWith("http")
            ? href
            : new URL(href, pageUrl).href,
        });
      });
    }

    // ---------- 4. Sort episodes ----------
    episodes.sort((a, b) => {
      const na = parseInt(a.title.match(/\d+/)?.[0] || "0", 10);
      const nb = parseInt(b.title.match(/\d+/)?.[0] || "0", 10);
      return na - nb;
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