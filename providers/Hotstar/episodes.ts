import { ProviderContext } from "../types";

const MAIN_URL = "https://net20.cc";
const API_BASE = `${MAIN_URL}/mobile/hs`;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const baseHeaders = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Cookie: "ott=hs; hd=on;",
  Referer: `${MAIN_URL}/home`,
};

async function getBypassCookie(axios: any): Promise<string> {
  try {
    // Attempt bypass on specific HS path first, then root
    const urls = [`${API_BASE}/p.php`, `${MAIN_URL}/p.php`];
    
    for (const url of urls) {
      const res = await axios.post(url, null, { headers: baseHeaders });
      
      // Check for success indicator in response
      if (res.data && JSON.stringify(res.data).includes('"r":"n"')) {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
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

  const [seriesId, seasonId, rawTitle, type] = url.split("|");
  const title = (rawTitle || "").replace(/[^a-zA-Z0-9 ]/g, "");

  if (type === "movie") {
    return [
      {
        title: "Full Movie",
        link: `${seriesId}|${title}`,
        image: `https://imgcdn.kim/hs/v/${seriesId}.jpg`,
      },
    ];
  }

  const episodes: any[] = [];
  const bypassCookie = await getBypassCookie(axios);
  
  // Even if bypass fails, try request (some IPs might not need it)
  const headers = {
    ...baseHeaders,
    Cookie: `${baseHeaders.Cookie} ${bypassCookie || ""}`,
  };

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const apiUrl =
      `${API_BASE}/episodes.php?s=${seasonId}` +
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
            link: `${ep.id}|${title}`,
            image: `https://imgcdn.kim/hsepimg/150/${ep.id}.jpg`,
          });
        });
      }

      if (data?.nextPageShow === 0 || !data?.episodes || data.episodes.length === 0) {
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