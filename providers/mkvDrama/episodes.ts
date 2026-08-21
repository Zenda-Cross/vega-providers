import { EpisodeLink, ProviderContext } from "../types";
import { getViewCrateLinks } from "./links";
import { getMkvDramaPage } from "./request";

function episodeNumber(text: string): number {
  return Number(text.match(/(?:episode|ep)\s*(\d+)/i)?.[1] || 0);
}

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const page = await getMkvDramaPage(url, providerContext);
  const episodes: EpisodeLink[] = await getViewCrateLinks(
    page,
    providerContext,
  );

  const quickDownload = await providerContext.kvStore?.get<boolean>("quickDownload");
  return episodes
    .sort((left, right) => {
      const difference = episodeNumber(left.title) - episodeNumber(right.title);
      return difference || left.title.localeCompare(right.title);
    })
    .map((e) => ({
      ...e,
      quickDownload: Boolean(quickDownload),
    }));
}
