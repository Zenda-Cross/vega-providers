import { ProviderContext } from "../types";

interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(url, { headers: commonHeaders })
    .then((res: any) => {
      const $ = cheerio.load(res.data);
      const episodePages: { title: string; page: string }[] = [];

      // =====================================================
      // STEP 1️⃣ : SERIES PAGE → EPISODE PAGES
      // =====================================================
      $("#episode_by_temp li").each((_, el) => {
        const card = $(el);

        const title =
          card.find("h2.entry-title").text().trim() ||
          card.find(".num-epi").text().trim();

        let page = card.find("a.lnk-blk").attr("href") || "";
        if (page) {
          if (page.startsWith("//")) page = "https:" + page;
          episodePages.push({ title, page });
        }
      });

      // =====================================================
      // STEP 2️⃣ : IF DIRECT EPISODE PAGE
      // =====================================================
      if (episodePages.length === 0) {
        return resolveEpisodeStream(
          url,
          axios,
          cheerio,
          commonHeaders,
          "Play"
        ).then((r) => (r ? [r] : []));
      }

      // =====================================================
      // STEP 3️⃣ : VISIT EACH EPISODE PAGE
      // =====================================================
      const tasks = episodePages.map((ep) =>
        resolveEpisodeStream(
          ep.page,
          axios,
          cheerio,
          commonHeaders,
          ep.title
        )
      );

      return Promise.all(tasks).then((all) =>
        all.filter(Boolean) as EpisodeLink[]
      );
    })
    .catch((err: any) => {
      console.log("episodes error:", err);
      return [];
    });
};

// =====================================================
// 🔥 CORE: 2-STEP IFRAME RESOLVER
// =====================================================
function resolveEpisodeStream(
  episodePage: string,
  axios: any,
  cheerio: any,
  headers: any,
  title: string
): Promise<EpisodeLink | null> {
  return axios
    .get(episodePage, { headers })
    .then((res: any) => {
      const $ = cheerio.load(res.data);

      // 1️⃣ FIRST IFRAME (toonstream embed)
      let embed =
        $("section.player iframe").first().attr("src") ||
        $("iframe").first().attr("src") ||
        "";

      if (!embed) return null;
      if (embed.startsWith("//")) embed = "https:" + embed;

      // 2️⃣ OPEN EMBED PAGE
      return axios.get(embed, { headers }).then((embedRes: any) => {
        const $$ = cheerio.load(embedRes.data);

        // ✅ REAL STREAM IFRAME
        let stream = $$(".Video iframe").attr("src") || "";
        if (!stream) return null;

        if (stream.startsWith("//")) stream = "https:" + stream;

        return {
          title,
          link: stream,
        };
      });
    })
    .catch(() => null);
}
