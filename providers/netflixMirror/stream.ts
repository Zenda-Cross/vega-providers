import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";
const STREAM_URL = "https://net51.cc";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

/**
 * EXACT Kotlin bypass(mainUrl)
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    const res = await axios.post(
      `${MAIN_URL}/tv/p.php`,
      null,
      {
        headers: {
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": `${MAIN_URL}/`,
          "Cookie": "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;",
        },
      }
    );

    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const str = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
      const match = str.match(/t_hash_t=[^;]+/);
      if (match) return match[0];
    }
  } catch {}

  return "";
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

  // link format: "ID|Title"
  const [id, title = ""] = link.split("|");

  /**
   * STEP 1 → bypass token
   */
  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  /**
   * STEP 2 → playlist.php (⚠️ MUST BE net20.cc)
   */
  const playlistRes = await axios.get(
    `${MAIN_URL}/tv/playlist.php?id=${id}&t=${encodeURIComponent(title)}&tm=${unixTime}`,
    {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${MAIN_URL}/home`,
        "Cookie": `${tHash}; ott=nf; hd=on`,
      },
    }
  );

  const streams: Stream[] = [];
  const playlist = playlistRes.data;

  /**
   * STEP 3 → build FINAL m3u8 (token untouched)
   */
  if (Array.isArray(playlist)) {
    for (const item of playlist) {
      for (const src of item.sources || []) {
        if (!src.file || !src.file.includes(".m3u8")) continue;

        // ✅ EXACT Kotlin behavior
        const finalUrl =
          STREAM_URL + src.file.replace("/tv/", "/");

        streams.push({
          server: `NetflixMirror ${src.label || "Auto"}`,
          link: finalUrl,
          type: "m3u8",
          headers: {
            "User-Agent": UA,
            "Accept": "*/*",
            "Cookie": "hd=on",
            "Referer": `${STREAM_URL}/`,
            "Origin": `${STREAM_URL}`,
          },
        });
      }
    }
  }

  return streams;
}
