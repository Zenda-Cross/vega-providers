import { Stream, ProviderContext } from "../types";

export const getStream = function ({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  return new Promise((resolve) => {
    const streamLinks: Stream[] = [];

    // URL se series name aur episode number extract karo
    const match = link.match(/\/anime\/([^/]+)\/episode\/(\d+)/);
    if (!match) return resolve([]);

    const seriesName = match[1];
    const episodeNumber = match[2];

    // M3U8 link generate
    const streamUrl = `https://hlsx3cdn.echovideo.to/${seriesName}/${episodeNumber}/master.m3u8`;

    streamLinks.push({
      server: "AniHub",
      link: streamUrl,
      type: "m3u8",
      subtitles: [],
    });

    resolve(streamLinks);
  });
};
