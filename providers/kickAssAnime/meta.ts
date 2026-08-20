import { Info, LinkList, ProviderContext } from "../types";

const BASE_URL = "https://kaa.lt";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function formatPoster(poster?: { hq?: string; sm?: string; url?: string }): string {
  if (!poster) return "";
  if (poster.hq) return `${BASE_URL}/image/poster/${poster.hq}.webp`;
  if (poster.sm) return `${BASE_URL}/image/poster/${poster.sm}.webp`;
  if (poster.url) return poster.url.startsWith("http") ? poster.url : `${BASE_URL}/${poster.url}`;
  return "";
}

function getLangLabel(lang: string): string {
  if (lang === "ja-JP") return "Sub";
  if (lang === "en-US") return "Dub";
  if (lang === "es-419" || lang === "es-ES") return "Spanish";
  if (lang === "ko-KR") return "Korean";
  if (lang === "zh-CN") return "Chinese";
  return lang;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerValue?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;

  const slug = link
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^\//, "")
    .split("/")[0];

  const detailRes = await axios.get(`${BASE_URL}/api/show/${slug}`, { headers });
  const data = detailRes.data || {};

  const title = data.title_en || data.title || slug;
  const synopsis = data.synopsis || "";
  const image = formatPoster(data.poster);
  const type: "movie" | "series" = data.type === "movie" ? "movie" : "series";

  let languages: string[] = ["ja-JP"];
  try {
    const langRes = await axios.get(`${BASE_URL}/api/show/${slug}/language`, { headers });
    if (Array.isArray(langRes.data?.result) && langRes.data.result.length > 0) {
      languages = langRes.data.result;
    }
  } catch {
    // fallback to ja-JP
  }

  const linkList: LinkList[] = [];

  for (const lang of languages) {
    try {
      const epRes = await axios.get(`${BASE_URL}/api/show/${slug}/episodes?page=1&lang=${lang}`, {
        headers,
      });
      let episodes = epRes.data?.result || [];
      const pages = epRes.data?.pages || [];

      if (pages.length > 1) {
        const remainingPages = await Promise.all(
          pages.slice(1).map((_: any, idx: number) =>
            axios
              .get(`${BASE_URL}/api/show/${slug}/episodes?page=${idx + 2}&lang=${lang}`, { headers })
              .then((r: any) => r.data?.result || [])
              .catch(() => [])
          )
        );
        episodes = episodes.concat(remainingPages.flat());
      }

      if (episodes.length > 0) {
        const directLinks = episodes.map((ep: any) => {
          const epTitle = `Episode ${ep.episode_string}${ep.title ? ` - ${ep.title}` : ""}`;
          return {
            title: epTitle,
            link: JSON.stringify({
              slug,
              epSlug: ep.slug,
              epNum: ep.episode_string,
              lang,
            }),
            type,
          };
        });

        const langLabel = getLangLabel(lang);
        linkList.push({
          title: languages.length > 1 ? `Episodes (${langLabel})` : "Episodes",
          directLinks,
        });
      }
    } catch {
      // ignore single language failure
    }
  }

  return {
    title,
    synopsis,
    image,
    type,
    linkList,
  };
};
