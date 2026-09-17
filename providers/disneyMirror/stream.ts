import { ProviderContext, Stream } from "../types";

export const getStream = async ({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  try {
    const { axios } = providerContext;
    const parts = link.split("|");
    const id = parts[0];
    const se = parts[1] || "0";

    const endpoint =
      se !== "0"
        ? `https://api2.imdb3.shop/api/tv/${id}`
        : `https://api2.imdb3.shop/api/movie/${id}`;

    const res = await axios.get(endpoint, {
      signal,
      headers: {
        Referer: "https://officialmoviebox.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const data = res.data?.results?.[0];
    const streamLinks: Stream[] = [];

    if (data?.trailer) {
      streamLinks.push({
        server: "Disney Preview (SD)",
        link: data.trailer,
        type: "mp4",
        quality: "720",
        headers: {
          Referer: "https://officialmoviebox.com/",
          Origin: "https://officialmoviebox.com",
        },
      });
    }

    return streamLinks;
  } catch (err) {
    console.error("disneyMirror getStream error:", err);
    return [];
  }
};
