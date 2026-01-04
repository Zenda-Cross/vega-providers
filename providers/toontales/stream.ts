import { Stream, ProviderContext } from "../types";

export const getStream = function ({
  link,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;

  return axios
    .get(link)
    .then((res: any) => {
      const html = res.data as string;

      // Match: file: "https://..."
      const match = html.match(/file:\s*"([^"]+)"/);
      if (!match) return [];

      const videoUrl = match[1];

      return [
        {
          server: "toontales",
          link: videoUrl,
          type: videoUrl.includes(".m3u8") ? "m3u8" : "mp4",
          subtitles: [],
        },
      ];
    })
    .catch(() => {
      return [];
    });
};
