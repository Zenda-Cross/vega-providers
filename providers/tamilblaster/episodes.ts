import { EpisodeLink, ProviderContext } from "../types";

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;

  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const episodes: EpisodeLink[] = [];

  $("iframe").each((_, iframe) => {
    const src = $(iframe).attr("src");
    if (!src) return;

    const title =
      $(iframe).prev("p").text().trim() || "Episode";

    episodes.push({
      title,
      link: src, // 👈 direct iframe link
    });
  });

  return episodes;
}
