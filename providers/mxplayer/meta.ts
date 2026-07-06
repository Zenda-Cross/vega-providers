import { Info, Link, ProviderContext } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

let cachedUserId: string | null = null;

const getUserId = () => {
  if (!cachedUserId) {
    cachedUserId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return cachedUserId;
};

const parseImage = (imageInfo: any[]): string => {
  if (!imageInfo || imageInfo.length === 0) return "";
  const landscape = imageInfo.find((img: any) => img.type === "landscape");
  const path = landscape ? landscape.url : imageInfo[0].url;
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://isa-1.mxplay.com/${path}`;
};

function parseState(str: string): any {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return JSON.parse(str.substring(0, i + 1));
        }
      }
    }
  }
  throw new Error("No matching closing brace found.");
}


export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios } = providerContext;
    const parts = link.split("*");
    const id = parts[0];
    const type = parts[1] || "episode";
    const webUrl = parts[2] || "";

    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.mxplayer.in/",
      "Origin": "https://www.mxplayer.in",
    };

    if (type === "tvshow" || type === "tv_show") {
      // Scrape show page to get seasons list
      const showUrl = `https://www.mxplayer.in${webUrl}`;
      const showRes = await axios.get(showUrl, { headers });
      const html = showRes.data || "";
      
      const match = html.match(/window\.__mxs__\s*=\s*({.*)/s) || html.match(/__mxs__\s*=\s*({.*)/s);
      const seasons: { id: string; title: string; sequence: number }[] = [];

      if (match) {
        try {
          const data = parseState(match[1]);
          const entities = data.entities || {};
          Object.values(entities).forEach((ev: any) => {
            if (ev.type === "tvshow" || ev.type === "tv_show") {
              const tabs = ev.tabs || [];
              tabs.forEach((tab: any) => {
                if (tab.type === "tvshowepisodes") {
                  const containers = tab.containers || [];
                  containers.forEach((c: any) => {
                    if (c.type === "season") {
                      const seq = c.sequence || c.season_number || c.seasonNo || 1;
                      seasons.push({
                        id: c.id,
                        title: c.title || `Season ${seq}`,
                        sequence: Number(seq),
                      });
                    }
                  });
                }
              });
            }
          });
        } catch (e) {
          console.error("MXPlayer parse seasons JSON error:", e);
        }
      }

      seasons.sort((a, b) => a.sequence - b.sequence);

      return {
        title: "TV Show",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "series",
        linkList: seasons.map((s) => ({
          title: s.title,
          episodesLink: `${s.id}*season`,
        })),
      };
    } else {
      // Movie or direct Video Episode
      const url = `https://api.mxplayer.in/v1/web/detail/video?id=${id}&type=${type}&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
      const res = await axios.get(url, { headers });
      const data = res.data || {};

      const title = data.title || "";
      const synopsis = data.description || "";
      const image = parseImage(data.imageInfo);
      const rating = data.rating ? (data.rating / 2).toFixed(1) : "";

      return {
        title,
        synopsis,
        image,
        imdbId: "",
        type: type === "movie" ? "movie" : "series",
        rating,
        linkList: [
          {
            title: "Play",
            directLinks: [
              {
                title,
                link: `${id}*${type}`,
              },
            ],
          },
        ],
      };
    }
  } catch (err) {
    console.error("MXPlayer getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
