import { Stream, ProviderContext, TextTracks } from "../types";

export const getStream = async function ({
  link: id,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, getBaseUrl } = providerContext;
    const streamLinks: Stream[] = [];
    const subtitles: TextTracks = [];
    const baseUrl = await getBaseUrl("kissKh");
    const streamUrl =
      "https://adorable-salamander-ecbb21.netlify.app/api/kisskh/video?id=" +
      id;
    const res = await axios.get(streamUrl);
    const stream = res.data?.source?.Video;
    const subData = res.data?.subtitles;
    subData?.map((sub: any) => {
      subtitles.push({
        title: sub?.label,
        language: sub?.land,
        type: sub?.src?.includes(".vtt") ? "text/vtt" : "application/x-subrip",
        uri: sub?.src,
      });
    });
    streamLinks.push({
      server: "kissKh",
      link: stream,
      type: stream?.includes(".mp4") ? "mp4" : "m3u8",
      headers: {
        referer: baseUrl,
      },
    });
    return streamLinks;
  } catch (err) {
    console.error(err);
    return [];
  }
};
