import { Stream, ProviderContext } from "../types";

type ZephyrResponse =
  | string
  | {
      [key: string]: string;
    };

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;
  const streams: Stream[] = [];

  try {
    // ==================================================
    // STEP 1️⃣ : EPISODE PAGE → FIRST IFRAME
    // ==================================================
    const epRes = await axios.get(link);
    const $ = cheerio.load(epRes.data);

    let embed =
      $("section.player iframe").attr("src") ||
      $("iframe").attr("src");

    if (!embed) return [];
    if (embed.startsWith("//")) embed = "https:" + embed;

    // ==================================================
    // STEP 2️⃣ : FIRST IFRAME → ZEPHYRFLICK IFRAME
    // ==================================================
    const embedRes = await axios.get(embed);
    const $$ = cheerio.load(embedRes.data);

    let zephyr =
      $$(".Video iframe").attr("src") ||
      $$("iframe").attr("src");

    if (!zephyr) return [];
    if (zephyr.startsWith("//")) zephyr = "https:" + zephyr;

    // ==================================================
    // STEP 3️⃣ : EXTRACT VIDEO HASH
    // ==================================================
    const idMatch = zephyr.match(/\/video\/([a-f0-9]+)/i);
    if (!idMatch) return [];

    const videoId = idMatch[1];
    const base = zephyr.split("/").slice(0, 3).join("/");
    const apiUrl = `${base}/player/index.php?data=${videoId}&do=getVideo`;

    // ==================================================
    // STEP 4️⃣ : AJAX PLAYER REQUEST
    // ==================================================
    const headers = {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      Referer: zephyr,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    };

    const body = `hash=${videoId}&r=`;

    const apiRes = await axios.post<ZephyrResponse>(apiUrl, body, {
      headers,
    });

    // ==================================================
    // STEP 5️⃣ : FIND M3U8
    // ==================================================
    let m3u8: string | undefined;

    if (typeof apiRes.data === "string") {
      const match = apiRes.data.match(
        /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i
      );
      m3u8 = match?.[0];
    } else {
      for (const val of Object.values(apiRes.data)) {
        if (typeof val === "string" && val.includes(".m3u8")) {
          m3u8 = val;
          break;
        }
      }
    }

    if (!m3u8) return [];

    // ==================================================
    // STEP 6️⃣ : RETURN STREAM
    // ==================================================
    streams.push({
      server: "ToonStream",
      link: m3u8,
      type: "m3u8",
      subtitles: [],
    });

    return streams;
  } catch (err) {
    console.error("ToonStream extractor error:", err);
    return [];
  }
};
