import { EpisodeLink, ProviderContext } from "../types";

export async function getEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const res = await providerContext.axios.get(url);
    const $ = providerContext.cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    // Agar anchor tag me episode links diye hain
    $("a").each((i, el) => {
      const $el = $(el);
      const href = ($el.attr("href") || "").trim();
      const text = $el.text().trim();

      if (href && (text.includes("Episode") || /E\d+/i.test(text) || href.includes("vcloud.lol"))) {
        let epNum = text.match(/E\d+/i)?.[0] || text;
        if (/^\d+$/.test(epNum)) epNum = `Episode ${epNum}`;
        episodes.push({
          title: epNum,
          link: href,
        });
      }
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
}

// ✅ Ye wrapper export karna zaroori hai
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}
