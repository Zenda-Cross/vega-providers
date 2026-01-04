import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";
const STREAM_URL = "https://net51.cc";

const USER_TOKEN = "233123f803cf02184bf6c67e149cdd50";

const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36";

/**
 * PRIMEVIDEO BYPASS (t_hash_t)
 * SAME AS KOTLIN bypass(mainUrl)
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${MAIN_URL}/`,
        Cookie: `ott=pv; hd=on; user_token=${USER_TOKEN};`,
      },
    });

    const sc = res.headers["set-cookie"];
    if (sc) {
      const raw = Array.isArray(sc) ? sc.join(";") : sc;
      const match = raw.match(/t_hash_t=[^;]+/);
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

  // link: ID|Title
  const [id, title = ""] = link.split("|");

  /**
   * STEP 1 → bypass
   */
  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  /**
   * STEP 2 → playlist (net20)
   */
  const playlistRes = await axios.get(
    `${MAIN_URL}/pv/playlist.php?id=${id}&t=${encodeURIComponent(
      title
    )}&tm=${unixTime}`,
    {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${MAIN_URL}/home`,
        Cookie: `${tHash}; ott=pv; hd=on`,
      },
    }
  );

  const playlist = playlistRes.data;
  const streams: Stream[] = [];

  /**
   * STEP 3 → FINAL STREAM (net51)
   * ⚠️ MINIMAL HEADERS (KOTLIN STYLE)
   */
  if (Array.isArray(playlist)) {
    for (const item of playlist) {
      for (const src of item.sources || []) {
        if (!src.file || !src.file.includes(".m3u8")) continue;

        const finalUrl =
          STREAM_URL + src.file.replace("/tv/", "/");

        streams.push({
          server: `PrimeVideo ${src.label || "Auto"}`,
          link: finalUrl,
          type: "m3u8",
          headers: {
            // ✅ EXACT CLOUDSTREAM BEHAVIOR
            "User-Agent": UA,
            Cookie: "hd=on",
            Referer: `${STREAM_URL}/`,
          },
        });
      }
    }
  }

  return streams;
}
