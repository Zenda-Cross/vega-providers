import { ProviderContext } from "../types";

export async function getEpisodes(url: string, providerContext: ProviderContext) {
  try {
    const res = await providerContext.axios.get(url);
    const $ = providerContext.cheerio.load(res.data);
    const episodes: { title: string; link: string }[] = [];

    $(".episode-list a").each((i, el) => {
      const link = $(el).attr("href") || "";
      const title = $(el).text().trim() || "";
      if (link && title) episodes.push({ link, title });
    });

    return episodes;
  } catch (err) {
    console.error("HDMovie2 getEpisodes error:", err);
    return [];
  }
}

