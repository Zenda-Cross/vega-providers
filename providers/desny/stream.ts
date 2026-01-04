import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";
const STREAM_URL = "https://net51.cc";

const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36";

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const unix = Math.floor(Date.now() / 1000);
  const [id, title = ""] = link.split("|");

  const playlistRes = await axios.get(
    `${MAIN_URL}/mobile/hs/playlist.php?id=${id}&t=${encodeURIComponent(
      title
    )}&tm=${unix}`,
    {
      headers: {
        "User-Agent": UA,
        Referer: `${MAIN_URL}/home`,
        Cookie: "ott=dp; hd=on;",
      },
    }
  );

  const streams: Stream[] = [];

  playlistRes.data.forEach((item: any) => {
    item.sources?.forEach((src: any) => {
      streams.push({
        server: `Disney Plus ${src.label || "Auto"}`,
        link: STREAM_URL + src.file,
        type: "m3u8",
        headers: {
          "User-Agent": UA,
          Referer: `${STREAM_URL}/`,
          Origin: `${STREAM_URL}`,
          Cookie: "hd=on",
        },
      });
    });
  });

  return streams;
}
