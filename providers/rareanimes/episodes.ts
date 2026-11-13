import { EpisodeLink, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  getCinemetaMeta,
  CinemetaMeta,
  enrichCinemetaEpisodes,
  readCinemetaContext,
} from "../getCinemetaMeta";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data || "");

    /* ★ Optional: if the URL carries imdb/season context, fetch
       Cinemeta so we can canonicalise the episode list below.
       Safe no-op when the URL is just a hubcloud/episode page. */
    let cinemeta: CinemetaMeta | null = null;
    let contextSeason: number | null = null;
    try {
      const ctx = readCinemetaContext(url);
      if (ctx.imdbId && ctx.season) {
        contextSeason = ctx.season;
        cinemeta = await getCinemetaMeta(ctx.imdbId, "series", providerContext);
      }
    } catch (e) {
      // context reading is best-effort; ignore failures
    }

    /* ─── STEP 1: season-page → episode pages ─────────────── */
    const episodePages: { title: string; page: string }[] = [];
    $("#episode_by_temp li, #episode_by_temp article.post").each((_, el) => {
      const card = $(el);
      const title =
        card.find("h2.entry-title").text().trim() ||
        card.find(".num-epi").text().trim() ||
        "Episode";
      let page = card.find("a.lnk-blk").attr("href") || "";
      if (!page) return;
      if (page.startsWith("//")) page = "https:" + page;
      else if (page.startsWith("/")) page = new URL(page, url).href;
      episodePages.push({ title, page });
    });

    /* ─── STEP 2: no episode list → resolve this page directly ─ */
    if (episodePages.length === 0) {
      const single = await resolveEpisodeStream(
        url, axios, cheerio, headers, "Play",
      );
      return single ? [single] : [];
    }

    /* ─── STEP 3: enrich titles with Cinemeta if available ─── */
    let pages = episodePages;
    if (cinemeta?.videos && contextSeason !== null) {
      const asLinks: EpisodeLink[] = episodePages.map((ep) => ({
        title: ep.title,
        link: ep.page,
      }));
      const enriched = enrichCinemetaEpisodes(
        asLinks,
        cinemeta.videos,
        contextSeason,
      );
      pages = enriched.map((e) => ({
        title: e.title,
        page: e.link,
      }));
    }

    /* ─── STEP 4: resolve every episode → stream iframe ────── */
    const tasks = pages.map((ep) =>
      resolveEpisodeStream(ep.page, axios, cheerio, headers, ep.title),
    );
    const all = await Promise.all(tasks);
    return all.filter((x): x is EpisodeLink => x !== null);
  } catch (err) {
    throwProviderError("RareAnimes", "episodes", err);
  }
};

/* ------------------------------------------------------------------ */
/*  Core: 2-step iframe resolver                                       */
/* ------------------------------------------------------------------ */
async function resolveEpisodeStream(
  episodePage: string,
  axios: any,
  cheerio: any,
  headers: any,
  title: string,
): Promise<EpisodeLink | null> {
  try {
    const res = await axios.get(episodePage, { headers });
    const $ = cheerio.load(res.data || "");

    let embed =
      $("section.player iframe").first().attr("src") ||
      $("iframe#main-video-frame").attr("src") ||
      $("iframe").first().attr("src") ||
      "";
    if (!embed) return null;
    if (embed.startsWith("//")) embed = "https:" + embed;
    else if (embed.startsWith("/")) embed = new URL(embed, episodePage).href;

    const embedRes = await axios.get(embed, { headers });
    const $$ = cheerio.load(embedRes.data || "");

    let stream =
      $$(".Video iframe").attr("src") ||
      $$("iframe").first().attr("src") ||
      "";
    if (!stream) return null;
    if (stream.startsWith("//")) stream = "https:" + stream;
    else if (stream.startsWith("/")) stream = new URL(stream, embed).href;

    return { title, link: stream };
  } catch {
    return null;
  }
}