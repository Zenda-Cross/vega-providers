import { Info, ProviderContext } from "../types";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractVideoId(link: string): string {
  const match =
    link.match(/(?:v=|\/watch\?v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/i) ||
    link.match(/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : link;
}

function formatViews(rawCount: number | string): string {
  const num = typeof rawCount === "number" ? rawCount : parseInt(rawCount, 10);
  if (isNaN(num) || num <= 0) return "";
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B views";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M views";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K views";
  }
  return num.toLocaleString() + " views";
}

function formatDuration(totalSeconds: number | string): string {
  const sec = typeof totalSeconds === "number" ? totalSeconds : parseInt(totalSeconds, 10);
  if (isNaN(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const videoId = extractVideoId(link);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const res = await axios.get(watchUrl, { headers: defaultHeaders });
    const $ = cheerio.load(res.data);

    let title =
      $('meta[name="title"]').attr("content") ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().replace(/ - YouTube$/, "").trim();

    let synopsis =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    let channel =
      $('link[itemprop="name"]').attr("content") ||
      $('span[itemprop="author"] link[itemprop="name"]').attr("content") ||
      "";

    let formattedViewCount = "";
    let durationStr = "";
    let publishDateStr = "";
    let category = "";
    let likes = "";

    // 1. Parse ytInitialPlayerResponse for video details & microformat
    const prMatch =
      res.data.match(/var ytInitialPlayerResponse\s*=\s*({.+?});(?:var|<\/script>)/) ||
      res.data.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);

    if (prMatch) {
      try {
        const pr = JSON.parse(prMatch[1]);
        const details = pr.videoDetails;
        if (details) {
          title = details.title || title;
          synopsis = details.shortDescription || synopsis;
          channel = details.author || channel;
          if (details.viewCount) {
            formattedViewCount = formatViews(details.viewCount);
          }
          if (details.lengthSeconds) {
            durationStr = formatDuration(details.lengthSeconds);
          }
        }

        const micro = pr.microformat?.playerMicroformatRenderer;
        if (micro) {
          if (micro.category) {
            category = micro.category;
          }
          const pubDate = micro.publishDate || micro.uploadDate;
          if (pubDate) {
            const dateObj = new Date(pubDate);
            if (!isNaN(dateObj.getTime())) {
              publishDateStr = dateObj.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            }
          }
        }
      } catch {
        // ignore parse error
      }
    }

    // 2. Parse ytInitialData for likes count
    const dMatch =
      res.data.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) ||
      res.data.match(/ytInitialData\s*=\s*({.+?});/);

    if (dMatch) {
      try {
        const data = JSON.parse(dMatch[1]);
        function findLikes(obj: any) {
          if (!obj || typeof obj !== "object" || likes) return;
          if (obj.iconName === "LIKE" && typeof obj.title === "string") {
            likes = obj.title.trim();
            return;
          }
          if (
            obj.defaultText &&
            typeof obj.defaultText.simpleText === "string" &&
            /^[0-9.]+[KMB]?$/i.test(obj.defaultText.simpleText)
          ) {
            likes = obj.defaultText.simpleText.trim();
            return;
          }
          for (const k of Object.keys(obj)) {
            if (!likes) findLikes(obj[k]);
          }
        }
        findLikes(data);
      } catch {
        // ignore parse error
      }
    }

    // Fallback regex for likes
    if (!likes) {
      const regexMatch = res.data.match(/"iconName":"LIKE"[^}]*?"title":"([^"]+)"/);
      if (regexMatch) likes = regexMatch[1].trim();
    }

    // Build informative tags (views, likes, duration, date, category) instead of SEO hashtags
    const tags: string[] = [];
    if (formattedViewCount) tags.push(formattedViewCount);
    if (likes) tags.push(likes.toLowerCase().includes("like") ? likes : `${likes} likes`);
    if (durationStr) tags.push(`⏱ ${durationStr}`);
    if (publishDateStr) tags.push(publishDateStr);
    if (category) tags.push(category);

    // High quality landscape image (16:9)
    const landscapeImage = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    const fallbackImage = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      title: title || "YouTube Video",
      synopsis,
      image: landscapeImage || fallbackImage,
      poster: landscapeImage || fallbackImage,
      imdbId: "",
      type: "movie",
      cast: channel ? [channel] : undefined,
      tags: tags.length > 0 ? tags : undefined,
      rating: undefined, // Do not set rating to avoid "views/10" in the app UI
      linkList: [
        {
          title: "Watch Video",
          quality: "HD",
          directLinks: [
            {
              title: "Play Video",
              link: `https://www.youtube.com/watch?v=${videoId}`,
              type: "movie",
              image: landscapeImage,
            },
          ],
        },
      ],
      webUrl: watchUrl,
    };
  } catch (err) {
    console.error("YouTube getMeta error:", err);
    const landscapeImage = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    return {
      title: "YouTube Video",
      synopsis: "",
      image: landscapeImage,
      poster: landscapeImage,
      imdbId: "",
      type: "movie",
      linkList: [
        {
          title: "Watch Video",
          quality: "HD",
          directLinks: [
            {
              title: "Play Video",
              link: `https://www.youtube.com/watch?v=${videoId}`,
              type: "movie",
            },
          ],
        },
      ],
      webUrl: watchUrl,
    };
  }
};
