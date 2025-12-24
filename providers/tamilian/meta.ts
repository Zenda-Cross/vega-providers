import { Info, ProviderContext } from "../types";

const headers = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const BASE_URL = "https://tamilian.io";
const PROXY_URL = "https://api.allorigins.win/raw?url=";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    if (!link.startsWith("http")) return empty;

    // --------------------------------------------------
    // 1️⃣ Parse link & ajax param
    // --------------------------------------------------
    const urlObj = new URL(link);
    const ajaxPath = urlObj.searchParams.get("ajax"); // /ajax/movie_load_info/4723/
    if (!ajaxPath) return empty;

    const movieId = ajaxPath.match(/\/(\d+)\//)?.[1];
    if (!movieId) return empty;

    // --------------------------------------------------
    // 2️⃣ Load movie page (for title / image)
    // --------------------------------------------------
    const pageUrl = PROXY_URL + encodeURIComponent(urlObj.origin + urlObj.pathname);
    const pageRes = await axios.get(pageUrl, { headers });
    const $page = cheerio.load(pageRes.data || "");

    const title = $page(".mvic-desc > h3").first().text().trim();
    const synopsis = $page(".mvic-desc .desc").first().text().trim();

    const posterStyle = $page(".thumb.mvic-thumb").attr("style") || "";
    const posterMatch = posterStyle.match(/url\((['"]?)(.*?)\1\)/);
    const image = posterMatch?.[2] || "";

    // --------------------------------------------------
    // 3️⃣ Get servers list
    // --------------------------------------------------
    const serversApi =
      `${BASE_URL}/ajax/movie/episode/servers/${movieId}_1_full`;

    const serversRes = await axios.get(
      PROXY_URL + encodeURIComponent(serversApi),
      { headers }
    );

    const serversHtml = serversRes.data?.html || "";
    if (!serversHtml) return empty;

    const $servers = cheerio.load(serversHtml);

    const directLinks: {
      title: string;
      link: string;
      type: "movie";
      quality?: string;
    }[] = [];

    // --------------------------------------------------
    // 4️⃣ For each server → fetch source
    // --------------------------------------------------
    const serverEls = $servers("a[data-id][data-name]").toArray();

    for (const el of serverEls) {
      const serverId = $servers(el).attr("data-id");
      const serverName = $servers(el).attr("data-name");

      if (!serverId || !serverName) continue;

      const sourceApi =
        `${BASE_URL}/ajax/movie/episode/server/sources/${serverId}_${serverName}`;

      try {
        const sourceRes = await axios.get(
          PROXY_URL + encodeURIComponent(sourceApi),
          { headers }
        );

        if (sourceRes.data?.status && sourceRes.data?.src) {
          directLinks.push({
            title: "Server",
            link: sourceRes.data.src, // ✅ FINAL VIDEO / EMBED LINK
            type: "movie",
            quality: "HD",
          });
        }
      } catch {
        continue;
      }
    }

    // --------------------------------------------------
    // 5️⃣ Return final Info
    // --------------------------------------------------
    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type: "movie",
      linkList: directLinks.length
        ? [
            {
              title: "Watch",
              quality: "HD",
              directLinks,
            },
          ]
        : [],
    };
  } catch (err) {
    console.error("❌ Meta fetch error:", err);
    return empty;
  }
};
