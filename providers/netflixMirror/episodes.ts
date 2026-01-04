import { ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const baseHeaders = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Cookie: "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;",
  Referer: `${MAIN_URL}/tv/home`,
};

/**
 * Required to pass server check
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    const url = `${MAIN_URL}/tv/p.php`;

    for (let i = 0; i < 3; i++) {
      const res = await axios.post(url, null, { headers: baseHeaders });

      if (res.data && JSON.stringify(res.data).includes('"r":"n"')) {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie)
            ? setCookie.join(";")
            : setCookie;

          const match = cookieStr.match(/t_hash_t=[^;]+/);
          if (match) return match[0];
        }
      }
    }
  } catch (e) {
    console.error("Bypass cookie error:", e);
  }
  return "";
}

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<{ title: string; link: string; image?: string }[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  /**
   * url format:
   * seriesId|seasonId|title|type
   */
  const [seriesId, seasonId, rawTitle, type] = url.split("|");
  const title = (rawTitle || "").replace(/[^a-zA-Z0-9 ]/g, "");

  // 🎬 MOVIE CASE
  if (type === "movie") {
    return [
      {
        title: "Full Movie",
        link: `${seriesId}|${title}`,
        image: `https://imgcdn.kim/poster/v/${seriesId}.jpg`,
      },
    ];
  }

  const episodes: any[] = [];

  // 1️⃣ Get bypass cookie
  const bypassCookie = await getBypassCookie(axios);
  if (!bypassCookie) return [];

  const headers = {
    ...baseHeaders,
    Cookie: `${baseHeaders.Cookie} ${bypassCookie}`,
  };

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const apiUrl =
      `${MAIN_URL}/episodes.php?s=${seasonId}` +
      `&series=${seriesId}` +
      `&t=${unixTime}` +
      `&page=${page}`;

    try {
      const res = await axios.get(apiUrl, { headers });
      const data = res.data;

      if (Array.isArray(data?.episodes)) {
        data.episodes.forEach((ep: any) => {
          if (!ep?.id) return;

          const epNum = ep.ep ? ep.ep.replace(/[^\d]/g, "") : "";
          const epName = ep.t || `Episode ${epNum}`;

          episodes.push({
            title: `E${epNum} - ${epName}`,
            // ⚠️ VERY IMPORTANT → EPISODE ID ONLY
            link: `${ep.id}|${title}`,
            image: `https://imgcdn.kim/epimg/150/${ep.id}.jpg`,
          });
        });
      }

      // pagination end
      if (data?.nextPageShow === 0) {
        hasNextPage = false;
      } else {
        page++;
      }
    } catch (e) {
      console.error("Episodes fetch error:", e);
      hasNextPage = false;
    }
  }

  return episodes;
}
