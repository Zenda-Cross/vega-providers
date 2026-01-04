import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";
const STREAM_URL = "https://net51.cc";

const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36";

async function getBypassCookie(axios: any): Promise<string> {
  const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${MAIN_URL}/`,
      Cookie: "ott=hs; hd=on;",
    },
  });

  const sc = res.headers["set-cookie"];
  if (!sc) return "";

  const raw = Array.isArray(sc) ? sc.join(";") : sc;
  const match = raw.match(/t_hash_t=[^;]+/);
  return match ? match[0] : "";
}

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  const [id, title = ""] = link.split("|");

  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  const playlistRes = await axios.get(
    `${MAIN_URL}/mobile/hs/playlist.php?id=${id}&t=${encodeURIComponent(
      title
    )}&tm=${unixTime}`,
    {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${MAIN_URL}/home`,
        Cookie: `${tHash}; ott=hs; hd=on`,
      },
    }
  );

  const playlist = playlistRes.data;
  const streams: Stream[] = [];

  if (!Array.isArray(playlist)) return [];

  for (const item of playlist) {
    for (const src of item.sources || []) {
      if (!src.file || !src.file.includes(".m3u8")) continue;

      streams.push({
        server: `Hotstar ${src.label || "Auto"}`,
        link: `${STREAM_URL}${src.file}`,
        type: "m3u8",
        headers: {
          "User-Agent": UA,
          "Cookie": "hd=on",
          "Referer": `${STREAM_URL}/home`,
        },
      });
    }
  }

  return streams;
}
