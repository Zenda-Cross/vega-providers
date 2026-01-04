import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;

  try {
    const res = await axios.get(link);
    const $ = cheerio.load(res.data);

    // 🔥 Direct MP4 video
    let videoUrl =
      $("video").attr("src") ||
      $("video source").attr("src") ||
      "";

    if (!videoUrl) return [];

    if (videoUrl.startsWith("//")) {
      videoUrl = "https:" + videoUrl;
    }

    return [
      {
        server: "topcartoons",
        link: videoUrl,
        type: "mp4",
        subtitles: [],
      },
    ];
  } catch (err) {
    console.error("Topcartoons stream error:", err);
    return [];
  }
};
